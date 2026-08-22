"use server";

import { addMinutes, differenceInMinutes, subMinutes } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/server/db";
import { can, type Actor } from "@/modules/access-control/can";
import {
  requireActiveSession,
  requireDirector,
  requireSchoolStaff,
} from "@/modules/identity/auth/session";

import { assertScheduleSlotCanBeSaved } from "./hard-constraints";
import { parseLessonJournalFormData } from "./lesson-journal";
import {
  discardReadyScheduleGenerations,
  lockScheduleResources,
} from "./resource-lock";
import {
  createScheduleSlotSchema,
  moveScheduleSlotSchema,
  SCHOOL_TIME_ZONE,
  toUtcInterval,
} from "./schema";
import type { ScheduleActionState } from "./types";

const schedulePath = "/panel/plan";

export async function confirmLessonArrivalAction(
  _previous: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const session = await requireActiveSession(schedulePath);
  if (session.user.role !== "STUDENT") {
    return {
      status: "error",
      message: "Przybycie na zajęcia potwierdza uczeń ze swojego konta.",
    };
  }

  const parsed = z.string().uuid().safeParse(formData.get("slotId"));
  if (!parsed.success) {
    return { status: "error", message: "Nie rozpoznano tej lekcji." };
  }

  try {
    const now = new Date();
    await db.$transaction(async (transaction) => {
      const slot = await transaction.scheduleSlot.findFirst({
        where: {
          id: parsed.data,
          schoolId: session.user.schoolId,
          archivedAt: null,
          status: { not: "CANCELLED" },
          group: {
            enrollments: {
              some: {
                studentId: session.user.id,
                status: "ACTIVE",
              },
            },
          },
        },
        select: { id: true, startAt: true, endAt: true },
      });
      if (!slot) {
        throw new Error("Ta lekcja nie jest dostępna na Twoim koncie.");
      }

      const windowStart = subMinutes(slot.startAt, 30);
      const windowEnd = addMinutes(slot.endAt, 15);
      if (now < windowStart || now > windowEnd) {
        throw new Error(
          "Przybycie możesz potwierdzić od 30 minut przed lekcją do 15 minut po jej zakończeniu.",
        );
      }

      await transaction.lessonCheckIn.upsert({
        where: {
          scheduleSlotId_studentId: {
            scheduleSlotId: slot.id,
            studentId: session.user.id,
          },
        },
        update: { checkedInAt: now },
        create: {
          schoolId: session.user.schoolId,
          scheduleSlotId: slot.id,
          studentId: session.user.id,
          checkedInAt: now,
        },
      });
      await transaction.auditLog.create({
        data: {
          schoolId: session.user.schoolId,
          actorId: session.user.id,
          action: "schedule.lesson-arrival.confirmed",
          entityType: "ScheduleSlot",
          entityId: slot.id,
          metadata: { source: "student-self-check-in" },
        },
      });
    });

    revalidatePath(schedulePath);
    revalidatePath("/panel");
    return {
      status: "success",
      message: "Przybycie zostało potwierdzone. Wykładowca nadal wpisuje oficjalną obecność.",
      slotId: parsed.data,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się potwierdzić przybycia. Spróbuj ponownie.",
    };
  }
}

export async function saveLessonJournalAction(
  _previous: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const session = await requireSchoolStaff(schedulePath);
  const parsed = parseLessonJournalFormData(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.message };
  }

  try {
    const result = await db.$transaction(async (transaction) => {
      await lockScheduleResources(transaction, session.user.schoolId);
      const slot = await transaction.scheduleSlot.findFirst({
        where: {
          id: parsed.data.slotId,
          schoolId: session.user.schoolId,
          archivedAt: null,
          status: { not: "CANCELLED" },
        },
        select: {
          id: true,
          version: true,
          topic: true,
          teacherId: true,
          group: {
            select: {
              teachers: {
                where: { archivedAt: null },
                select: { teacherId: true },
              },
              enrollments: {
                where: { status: "ACTIVE" },
                select: { studentId: true },
              },
            },
          },
        },
      });
      if (!slot) {
        throw new Error("Ta lekcja nie jest już dostępna. Odśwież plan.");
      }

      const actor: Actor = {
        id: session.user.id,
        schoolId: session.user.schoolId,
        role: session.user.role,
      };
      const resource = {
        schoolId: session.user.schoolId,
        teacherIds: Array.from(
          new Set([
            slot.teacherId,
            ...slot.group.teachers.map((teacher) => teacher.teacherId),
          ]),
        ),
      };
      if (
        !can(actor, "edit:lesson", resource) ||
        !can(actor, "edit:attendance", resource)
      ) {
        throw new Error("Możesz uzupełniać tylko lekcje przypisanych grup.");
      }

      const enrolledStudentIds = new Set(
        slot.group.enrollments.map((enrollment) => enrollment.studentId),
      );
      if (
        parsed.data.attendance.some(
          (record) => !enrolledStudentIds.has(record.studentId),
        )
      ) {
        throw new Error("Skład grupy zmienił się. Odśwież lekcję.");
      }

      const updated = await transaction.scheduleSlot.updateMany({
        where: { id: slot.id, version: parsed.data.version },
        data: {
          topic: parsed.data.topic,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new Error(
          "Ktoś właśnie zmienił tę lekcję. Odśwież plan przed ponownym zapisem.",
        );
      }

      for (const record of parsed.data.attendance) {
        if (record.status === null) {
          await transaction.attendanceRecord.deleteMany({
            where: {
              scheduleSlotId: slot.id,
              studentId: record.studentId,
            },
          });
          continue;
        }
        await transaction.attendanceRecord.upsert({
          where: {
            scheduleSlotId_studentId: {
              scheduleSlotId: slot.id,
              studentId: record.studentId,
            },
          },
          update: {
            status: record.status,
            recordedById: session.user.id,
          },
          create: {
            schoolId: session.user.schoolId,
            scheduleSlotId: slot.id,
            studentId: record.studentId,
            recordedById: session.user.id,
            status: record.status,
          },
        });
      }

      const attendanceCounts = parsed.data.attendance.reduce<
        Record<string, number>
      >((counts, record) => {
        const key = record.status ?? "UNMARKED";
        counts[key] = (counts[key] ?? 0) + 1;
        return counts;
      }, {});
      await transaction.auditLog.create({
        data: {
          schoolId: session.user.schoolId,
          actorId: session.user.id,
          action: "schedule.lesson-journal.updated",
          entityType: "ScheduleSlot",
          entityId: slot.id,
          metadata: {
            topicChanged: slot.topic !== parsed.data.topic,
            attendanceCounts,
          },
        },
      });

      return slot.id;
    });

    revalidatePath(schedulePath);
    return {
      status: "success",
      message: "Temat i obecność zostały zapisane.",
      slotId: result,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać dziennika lekcji. Spróbuj ponownie.",
    };
  }
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
      const discardedGenerationCount =
        await discardReadyScheduleGenerations(tx, session.user.schoolId);
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
            discardedGenerationCount,
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
      const discardedGenerationCount =
        await discardReadyScheduleGenerations(tx, session.user.schoolId);
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
            discardedGenerationCount,
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
    const discardedGenerationCount =
      await discardReadyScheduleGenerations(
        transaction,
        session.user.schoolId,
      );
    await transaction.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action: "schedule.slot.cancelled",
        entityType: "ScheduleSlot",
        entityId: existing.id,
        metadata: { discardedGenerationCount },
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
