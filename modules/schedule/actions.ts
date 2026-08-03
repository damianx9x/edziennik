"use server";

import { differenceInMinutes } from "date-fns";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";

import { assertScheduleSlotCanBeSaved } from "./hard-constraints";
import { lockScheduleResources } from "./resource-lock";
import {
  createScheduleSlotSchema,
  moveScheduleSlotSchema,
  SCHOOL_TIME_ZONE,
  toUtcInterval,
} from "./schema";
import type { ScheduleActionState } from "./types";

const schedulePath = "/panel/plan";

export async function createScheduleSlotAction(
  _previous: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const session = await requireDirector(schedulePath);
  const parsed = createScheduleSlotSchema.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    durationMinutes: formData.get("durationMinutes"),
    groupId: formData.get("groupId"),
    roomId: formData.get("roomId"),
    teacherId: formData.get("teacherId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Sprawdź dane zajęć.",
    };
  }

  try {
    const interval = toUtcInterval(parsed.data);
    const resources = {
      groupId: parsed.data.groupId,
      roomId: parsed.data.roomId,
      teacherId: parsed.data.teacherId,
    };

    const result = await db.$transaction(async (tx) => {
      await lockScheduleResources(tx, session.user.schoolId);
      await assertScheduleSlotCanBeSaved(tx, {
        schoolId: session.user.schoolId,
        ...interval,
        ...resources,
      });

      const slot = await tx.scheduleSlot.create({
        data: {
          schoolId: session.user.schoolId,
          createdById: session.user.id,
          timeZone: SCHOOL_TIME_ZONE,
          ...interval,
          ...resources,
        },
        select: { id: true },
      });
      await tx.groupTeacher.upsert({
        where: {
          groupId_teacherId: {
            groupId: resources.groupId,
            teacherId: resources.teacherId,
          },
        },
        update: { archivedAt: null },
        create: {
          groupId: resources.groupId,
          teacherId: resources.teacherId,
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId: session.user.schoolId,
          actorId: session.user.id,
          action: "schedule.slot.created",
          entityType: "ScheduleSlot",
          entityId: slot.id,
          metadata: {
            startAt: interval.startAt.toISOString(),
            endAt: interval.endAt.toISOString(),
            ...resources,
          },
        },
      });
      return slot;
    });

    revalidatePath(schedulePath);
    revalidatePath("/panel/szkola");
    return {
      status: "success",
      message: "Zajęcia zostały dodane do grafiku.",
      slotId: result.id,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać zajęć. Spróbuj ponownie.",
    };
  }
}

export async function moveScheduleSlotAction(input: {
  slotId: string;
  date: string;
  startTime: string;
}): Promise<ScheduleActionState> {
  const session = await requireDirector(schedulePath);
  const parsed = moveScheduleSlotSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Sprawdź nowy termin.",
    };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      await lockScheduleResources(tx, session.user.schoolId);
      const existing = await tx.scheduleSlot.findFirst({
        where: {
          id: input.slotId,
          schoolId: session.user.schoolId,
          archivedAt: null,
          status: { not: "CANCELLED" },
        },
      });
      if (!existing) {
        throw new Error("Te zajęcia nie są już dostępne. Odśwież grafik.");
      }

      const durationMinutes = differenceInMinutes(existing.endAt, existing.startAt);
      const interval = toUtcInterval({
        ...parsed.data,
        durationMinutes,
      });
      const resources = {
        groupId: existing.groupId,
        roomId: existing.roomId,
        teacherId: existing.teacherId,
      };
      await assertScheduleSlotCanBeSaved(tx, {
        schoolId: session.user.schoolId,
        ...interval,
        ...resources,
        excludeId: existing.id,
      });

      const updated = await tx.scheduleSlot.update({
        where: { id: existing.id },
        data: {
          ...interval,
          version: { increment: 1 },
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          schoolId: session.user.schoolId,
          actorId: session.user.id,
          action: "schedule.slot.moved",
          entityType: "ScheduleSlot",
          entityId: updated.id,
          metadata: {
            from: existing.startAt.toISOString(),
            to: interval.startAt.toISOString(),
          },
        },
      });
      return updated;
    });

    revalidatePath(schedulePath);
    return {
      status: "success",
      message: "Termin zajęć został zmieniony.",
      slotId: result.id,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się przenieść zajęć. Spróbuj ponownie.",
    };
  }
}

export async function moveScheduleSlotFormAction(
  _previous: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  return moveScheduleSlotAction({
    slotId: String(formData.get("slotId") ?? ""),
    date: String(formData.get("date") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
  });
}

export async function cancelScheduleSlotAction(
  _previous: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const session = await requireDirector(schedulePath);
  const slotId = String(formData.get("slotId") ?? "");
  const cancelled = await db.$transaction(async (transaction) => {
    await lockScheduleResources(transaction, session.user.schoolId);
    const existing = await transaction.scheduleSlot.findFirst({
      where: {
        id: slotId,
        schoolId: session.user.schoolId,
        archivedAt: null,
        status: { not: "CANCELLED" },
      },
      select: { id: true },
    });
    if (!existing) {
      return false;
    }
    await transaction.scheduleSlot.update({
      where: { id: existing.id },
      data: { status: "CANCELLED", version: { increment: 1 } },
    });
    await transaction.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action: "schedule.slot.cancelled",
        entityType: "ScheduleSlot",
        entityId: existing.id,
      },
    });
    return true;
  });
  if (!cancelled) {
    return {
      status: "error",
      message: "Te zajęcia są już odwołane albo niedostępne.",
    };
  }
  revalidatePath(schedulePath);
  return {
    status: "success",
    message: "Zajęcia zostały odwołane.",
  };
}
