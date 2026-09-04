"use server";

import { addMinutes, differenceInMinutes, subMinutes } from "date-fns";
import { revalidatePath } from "next/cache";
import { requireEnabledModule } from "@/modules/module-access/server";
import { after } from "next/server";
import { z } from "zod";

import type { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/server/db";
import { can, type Actor } from "@/modules/access-control/can";
import {
  requireActiveSession,
  requireDirector,
  requireSchoolStaff,
} from "@/modules/identity/auth/session";
import { isPrivilegedIdentityRole } from "@/modules/identity/auth/access";

import { assertScheduleSlotCanBeSaved } from "./hard-constraints";
import { parseLessonJournalFormData } from "./lesson-journal";
import {
  discardReadyScheduleGenerations,
  lockScheduleResources,
} from "./resource-lock";
import {
  cancelScheduleSlotSchema,
  createScheduleSlotSchema,
  moveScheduleSlotSchema,
  reviewScheduleChangeRequestSchema,
  SCHOOL_TIME_ZONE,
  toUtcInterval,
} from "./schema";
import type { ScheduleActionState } from "./types";
import { processEmailDeliveryQueue } from "@/modules/messaging/queue";
import { sendCancellationSms } from "./cancellation-sms";

const schedulePath = "/panel/plan";

export async function confirmLessonArrivalAction(
  _previous: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const session = await requireActiveSession(schedulePath);
  await requireEnabledModule(session, "schedule");
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
  await requireEnabledModule(session, "schedule");
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
  await requireEnabledModule(session, "schedule");
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
  await requireEnabledModule(session, "schedule");
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
  const session = await requireActiveSession(schedulePath);
  await requireEnabledModule(session, "schedule");
  const parsed = cancelScheduleSlotSchema.safeParse({
    slotId: formData.get("slotId"),
    reason: formData.get("reason"),
    notifyGroup: true,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Sprawdź powód odwołania.",
    };
  }

  if (session.user.role === "TEACHER") {
    const slot = await db.scheduleSlot.findFirst({
      where: {
        id: parsed.data.slotId,
        schoolId: session.user.schoolId,
        teacherId: session.user.id,
        archivedAt: null,
        status: { not: "CANCELLED" },
      },
      select: { id: true, changeRequests: { where: { status: "PENDING" }, select: { id: true }, take: 1 } },
    });
    if (!slot) {
      return { status: "error", message: "Możesz zgłosić zmianę tylko dla swoich aktywnych zajęć." };
    }
    if (slot.changeRequests.length > 0) {
      return { status: "error", message: "Wniosek dotyczący tej lekcji już czeka na decyzję dyrektora." };
    }
    const request = await db.$transaction(async (transaction) => {
      const created = await transaction.scheduleChangeRequest.create({
        data: {
          schoolId: session.user.schoolId,
          scheduleSlotId: slot.id,
          requestedById: session.user.id,
          kind: "CANCEL",
          reason: parsed.data.reason,
        },
        select: { id: true },
      });
      await transaction.auditLog.create({
        data: {
          schoolId: session.user.schoolId,
          actorId: session.user.id,
          action: "schedule.change-request.created",
          entityType: "ScheduleChangeRequest",
          entityId: created.id,
          metadata: { kind: "CANCEL", scheduleSlotId: slot.id },
        },
      });
      return created;
    });
    revalidateScheduleViews();
    return {
      status: "success",
      message: "Wniosek trafił do dyrektora. Zajęcia pozostają w planie do czasu akceptacji.",
      slotId: request.id,
    };
  }

  if (!isPrivilegedIdentityRole(session.user.role)) {
    return { status: "error", message: "Tylko wykładowca lub dyrektor może odwołać zajęcia." };
  }

  const cancelled = await db.$transaction(async (transaction) => {
    await lockScheduleResources(transaction, session.user.schoolId);
    return cancelSlotInTransaction(transaction, {
      schoolId: session.user.schoolId,
      slotId: parsed.data.slotId,
      actorId: session.user.id,
      reason: parsed.data.reason,
      notifyGroup: parsed.data.notifyGroup,
    });
  });
  if (!cancelled) {
    return {
      status: "error",
      message: "Te zajęcia są już odwołane albo niedostępne.",
    };
  }
  revalidateScheduleViews();
  after(async () => { await Promise.allSettled([processEmailDeliveryQueue(session.user.schoolId), sendCancellationSms(parsed.data.slotId, session.user.schoolId)]); });
  return {
    status: "success",
    message: "Zajęcia zostały odwołane, a grupa otrzymała wiadomość i prywatne powiadomienia.",
  };
}

async function cancelSlotInTransaction(
  transaction: Prisma.TransactionClient,
  input: {
    schoolId: string;
    slotId: string;
    actorId: string;
    reason: string;
    notifyGroup: boolean;
    requestId?: string;
  },
) {
  const existing = await transaction.scheduleSlot.findFirst({
    where: {
      id: input.slotId,
      schoolId: input.schoolId,
      archivedAt: null,
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      startAt: true,
      groupId: true,
      group: {
        select: {
          name: true,
          teachers: { where: { archivedAt: null }, select: { teacherId: true } },
          enrollments: {
            where: { status: "ACTIVE" },
            select: {
              studentId: true,
              student: { select: { childLinks: { where: { archivedAt: null }, select: { parentId: true } } } },
            },
          },
        },
      },
    },
  });
  if (!existing) return false;

  await transaction.scheduleSlot.update({
    where: { id: existing.id },
    data: { status: "CANCELLED", version: { increment: 1 } },
  });
  await transaction.lessonCancellation.create({
    data: {
      schoolId: input.schoolId,
      scheduleSlotId: existing.id,
      cancelledById: input.actorId,
      reason: input.reason,
      notifyGroup: input.notifyGroup,
    },
  });

  let recipientCount = 0;
  if (input.notifyGroup) {
    const conversation = await transaction.conversation.upsert({
      where: { groupId: existing.groupId },
      create: { schoolId: input.schoolId, groupId: existing.groupId, kind: "GROUP" },
      update: { updatedAt: new Date() },
    });
    const message = await transaction.message.create({
      data: {
        schoolId: input.schoolId,
        conversationId: conversation.id,
        authorId: input.actorId,
        kind: "ANNOUNCEMENT",
        subject: `Odwołane zajęcia · ${existing.group.name}`,
        body: `Zajęcia zaplanowane na ${new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeStyle: "short", timeZone: SCHOOL_TIME_ZONE }).format(existing.startAt)} zostały odwołane. Powód: ${input.reason}`,
        clientRequestId: `lesson-cancel:${existing.id}`,
        requiresAcknowledgement: true,
      },
    });
    const recipientIds = [...new Set([
      ...existing.group.teachers.map((item) => item.teacherId),
      ...existing.group.enrollments.map((item) => item.studentId),
      ...existing.group.enrollments.flatMap((item) => item.student.childLinks.map((link) => link.parentId)),
    ])].filter((id) => id !== input.actorId);
    recipientCount = recipientIds.length;
    if (recipientIds.length > 0) {
      await transaction.emailDelivery.createMany({
        data: recipientIds.map((recipientId) => ({
          schoolId: input.schoolId,
          messageId: message.id,
          recipientId,
          idempotencyKey: `lesson-cancel:${existing.id}:recipient:${recipientId}`,
        })),
        skipDuplicates: true,
      });
    }
    await transaction.messageRead.create({
      data: { schoolId: input.schoolId, messageId: message.id, userId: input.actorId },
    });
  }

  if (input.requestId) {
    await transaction.scheduleChangeRequest.update({
      where: { id: input.requestId },
      data: {
        status: "APPROVED",
        reviewedById: input.actorId,
        reviewedAt: new Date(),
      },
    });
  }
  const discardedGenerationCount = await discardReadyScheduleGenerations(transaction, input.schoolId);
  await transaction.auditLog.create({
    data: {
      schoolId: input.schoolId,
      actorId: input.actorId,
      action: "schedule.slot.cancelled",
      entityType: "ScheduleSlot",
      entityId: existing.id,
      metadata: { discardedGenerationCount, recipientCount, sourceRequestId: input.requestId ?? null },
    },
  });
  return true;
}

export async function reviewScheduleChangeRequestAction(
  _previous: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const session = await requireDirector(schedulePath);
  await requireEnabledModule(session, "schedule");
  const parsed = reviewScheduleChangeRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    reviewNote: formData.get("reviewNote") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Sprawdź decyzję." };
  }

  const result = await db.$transaction(async (transaction) => {
    await lockScheduleResources(transaction, session.user.schoolId);
    const request = await transaction.scheduleChangeRequest.findFirst({
      where: { id: parsed.data.requestId, schoolId: session.user.schoolId, status: "PENDING" },
      select: { id: true, kind: true, reason: true, scheduleSlotId: true },
    });
    if (!request) return { ok: false, cancelled: false, slotId: null };
    if (parsed.data.decision === "REJECT") {
      await transaction.scheduleChangeRequest.update({
        where: { id: request.id },
        data: { status: "REJECTED", reviewedById: session.user.id, reviewedAt: new Date(), reviewNote: parsed.data.reviewNote },
      });
      await transaction.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "schedule.change-request.rejected", entityType: "ScheduleChangeRequest", entityId: request.id, metadata: { kind: request.kind } } });
      return { ok: true, cancelled: false, slotId: request.scheduleSlotId };
    }
    if (request.kind !== "CANCEL") return { ok: false, cancelled: false, slotId: request.scheduleSlotId };
    const cancelled = await cancelSlotInTransaction(transaction, {
      schoolId: session.user.schoolId,
      slotId: request.scheduleSlotId,
      actorId: session.user.id,
      reason: request.reason,
      notifyGroup: true,
      requestId: request.id,
    });
    return { ok: cancelled, cancelled, slotId: request.scheduleSlotId };
  });
  if (!result.ok) return { status: "error", message: "Wniosek jest już rozpatrzony albo lekcja nie jest dostępna." };
  revalidateScheduleViews();
  if (result.cancelled && result.slotId) after(async () => { await Promise.allSettled([processEmailDeliveryQueue(session.user.schoolId), sendCancellationSms(result.slotId!, session.user.schoolId)]); });
  return { status: "success", message: result.cancelled ? "Wniosek zaakceptowany. Zajęcia odwołano i wysłano powiadomienia." : "Wniosek został odrzucony." };
}

function revalidateScheduleViews() {
  revalidatePath(schedulePath);
  revalidatePath("/panel/wiadomosci");
  revalidatePath("/panel/powiadomienia");
  revalidatePath("/panel/szkola");
}
