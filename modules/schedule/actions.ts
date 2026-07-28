"use server";

import { differenceInMinutes } from "date-fns";
import { revalidatePath } from "next/cache";

import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";

import {
  createScheduleSlotSchema,
  moveScheduleSlotSchema,
  SCHOOL_TIME_ZONE,
  toUtcInterval,
} from "./schema";
import type { ScheduleActionState } from "./types";

const schedulePath = "/panel/plan";

type Conflict = {
  group: { name: string };
  room: { name: string };
  teacher: { name: string };
  groupId: string;
  roomId: string;
  teacherId: string;
  studentConflict?: boolean;
};

function conflictMessage(
  conflict: Conflict,
  resources: { groupId: string; roomId: string; teacherId: string },
) {
  const labels: string[] = [];
  if (conflict.roomId === resources.roomId) {
    labels.push(`sala „${conflict.room.name}”`);
  }
  if (conflict.teacherId === resources.teacherId) {
    labels.push(`wykładowca ${conflict.teacher.name}`);
  }
  if (conflict.groupId === resources.groupId) {
    labels.push(`grupa „${conflict.group.name}”`);
  }
  if (conflict.studentConflict && labels.length === 0) {
    return `Nie zapisano zajęć: co najmniej jeden uczeń ma już wtedy lekcję z grupą „${conflict.group.name}”. Wybierz inny termin.`;
  }
  return `Nie zapisano zajęć: ${labels.join(", ")} ma już wtedy lekcję. Wybierz inny termin.`;
}

async function assertResources(
  tx: Prisma.TransactionClient,
  schoolId: string,
  resources: { groupId: string; roomId: string; teacherId: string },
) {
  const [group, room, teacher] = await Promise.all([
    tx.courseGroup.findFirst({
      where: {
        id: resources.groupId,
        schoolId,
        isActive: true,
        archivedAt: null,
      },
      select: { id: true },
    }),
    tx.room.findFirst({
      where: {
        id: resources.roomId,
        schoolId,
        isActive: true,
        archivedAt: null,
      },
      select: { id: true },
    }),
    tx.user.findFirst({
      where: {
        id: resources.teacherId,
        schoolId,
        role: "TEACHER",
        status: "ACTIVE",
        archivedAt: null,
      },
      select: { id: true },
    }),
  ]);

  if (!group || !room || !teacher) {
    throw new Error(
      "Wybrana sala, grupa lub wykładowca nie jest już dostępny. Odśwież stronę.",
    );
  }
}

async function findConflict(
  tx: Prisma.TransactionClient,
  input: {
    schoolId: string;
    startAt: Date;
    endAt: Date;
    groupId: string;
    roomId: string;
    teacherId: string;
    excludeId?: string;
  },
) {
  const resourceConflict = await tx.scheduleSlot.findFirst({
    where: {
      id: input.excludeId ? { not: input.excludeId } : undefined,
      schoolId: input.schoolId,
      archivedAt: null,
      status: { not: "CANCELLED" },
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
      OR: [
        { groupId: input.groupId },
        { roomId: input.roomId },
        { teacherId: input.teacherId },
      ],
    },
    select: {
      groupId: true,
      roomId: true,
      teacherId: true,
      group: { select: { name: true } },
      room: { select: { name: true } },
      teacher: { select: { name: true } },
    },
  });
  if (resourceConflict) {
    return resourceConflict;
  }

  const studentIds = await tx.enrollment.findMany({
    where: {
      groupId: input.groupId,
      status: "ACTIVE",
    },
    select: { studentId: true },
  });
  if (studentIds.length === 0) {
    return null;
  }
  const studentConflict = await tx.scheduleSlot.findFirst({
    where: {
      id: input.excludeId ? { not: input.excludeId } : undefined,
      schoolId: input.schoolId,
      archivedAt: null,
      status: { not: "CANCELLED" },
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
      group: {
        enrollments: {
          some: {
            status: "ACTIVE",
            studentId: { in: studentIds.map((item) => item.studentId) },
          },
        },
      },
    },
    select: {
      groupId: true,
      roomId: true,
      teacherId: true,
      group: { select: { name: true } },
      room: { select: { name: true } },
      teacher: { select: { name: true } },
    },
  });
  return studentConflict
    ? { ...studentConflict, studentConflict: true }
    : null;
}

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
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${session.user.schoolId}))`;
      await assertResources(tx, session.user.schoolId, resources);
      const conflict = await findConflict(tx, {
        schoolId: session.user.schoolId,
        ...interval,
        ...resources,
      });
      if (conflict) {
        throw new Error(conflictMessage(conflict, resources));
      }

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
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${session.user.schoolId}))`;
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
      const conflict = await findConflict(tx, {
        schoolId: session.user.schoolId,
        ...interval,
        ...resources,
        excludeId: existing.id,
      });
      if (conflict) {
        throw new Error(conflictMessage(conflict, resources));
      }

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
  const existing = await db.scheduleSlot.findFirst({
    where: {
      id: slotId,
      schoolId: session.user.schoolId,
      archivedAt: null,
    },
    select: { id: true, status: true },
  });
  if (!existing || existing.status === "CANCELLED") {
    return {
      status: "error",
      message: "Te zajęcia są już odwołane albo niedostępne.",
    };
  }

  await db.$transaction([
    db.scheduleSlot.update({
      where: { id: existing.id },
      data: { status: "CANCELLED", version: { increment: 1 } },
    }),
    db.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action: "schedule.slot.cancelled",
        entityType: "ScheduleSlot",
        entityId: existing.id,
      },
    }),
  ]);
  revalidatePath(schedulePath);
  return {
    status: "success",
    message: "Zajęcia zostały odwołane.",
  };
}
