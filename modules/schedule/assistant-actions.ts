"use server";

import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";

import {
  getWeekStartKey,
  SCHOOL_TIME_ZONE,
  schedulingRequirementSchema,
  teacherAvailabilitySchema,
} from "./schema";
import { deterministicScheduleSolver } from "./solver";
import type { ScheduleActionState } from "./types";

const schedulePath = "/panel/plan";

function minuteValue(value: FormDataEntryValue | null) {
  const text = String(value ?? "");
  const [hour, minute] = text.split(":").map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute)
    ? hour * 60 + minute
    : Number.NaN;
}

export async function saveSchedulingRequirementAction(
  _previous: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const session = await requireDirector(schedulePath);
  const preferredStartRaw = String(formData.get("preferredStart") ?? "");
  const parsed = schedulingRequirementSchema.safeParse({
    groupId: formData.get("groupId"),
    teacherId: formData.get("teacherId"),
    preferredRoomId: formData.get("preferredRoomId"),
    lessonsPerWeek: formData.get("lessonsPerWeek"),
    durationMinutes: formData.get("durationMinutes"),
    allowedWeekdays: formData.getAll("allowedWeekdays"),
    preferredWeekdays: formData
      .getAll("preferredWeekdays")
      .filter((value) => String(value).length > 0),
    earliestStartMinute: minuteValue(formData.get("earliestStart")),
    latestEndMinute: minuteValue(formData.get("latestEnd")),
    preferredStartMinute: preferredStartRaw
      ? minuteValue(preferredStartRaw)
      : null,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Sprawdź wymagania dla tej grupy.",
    };
  }

  const [group, teacher, room] = await Promise.all([
    db.courseGroup.findFirst({
      where: {
        id: parsed.data.groupId,
        schoolId: session.user.schoolId,
        isActive: true,
        archivedAt: null,
      },
      select: { id: true },
    }),
    db.user.findFirst({
      where: {
        id: parsed.data.teacherId,
        schoolId: session.user.schoolId,
        role: "TEACHER",
        status: "ACTIVE",
        archivedAt: null,
      },
      select: { id: true },
    }),
    db.room.findFirst({
      where: {
        id: parsed.data.preferredRoomId,
        schoolId: session.user.schoolId,
        isActive: true,
        archivedAt: null,
      },
      select: { id: true },
    }),
  ]);
  if (!group || !teacher || !room) {
    return {
      status: "error",
      message: "Grupa, wykładowca lub sala nie są już aktywne.",
    };
  }

  await db.$transaction(async (tx) => {
    await tx.schedulingRequirement.upsert({
      where: { groupId: group.id },
      update: {
        schoolId: session.user.schoolId,
        teacherId: teacher.id,
        preferredRoomId: room.id,
        lessonsPerWeek: parsed.data.lessonsPerWeek,
        durationMinutes: parsed.data.durationMinutes,
        allowedWeekdays: parsed.data.allowedWeekdays,
        preferredWeekdays: parsed.data.preferredWeekdays,
        earliestStartMinute: parsed.data.earliestStartMinute,
        latestEndMinute: parsed.data.latestEndMinute,
        preferredStartMinute: parsed.data.preferredStartMinute,
        isActive: true,
      },
      create: {
        schoolId: session.user.schoolId,
        groupId: group.id,
        teacherId: teacher.id,
        preferredRoomId: room.id,
        lessonsPerWeek: parsed.data.lessonsPerWeek,
        durationMinutes: parsed.data.durationMinutes,
        allowedWeekdays: parsed.data.allowedWeekdays,
        preferredWeekdays: parsed.data.preferredWeekdays,
        earliestStartMinute: parsed.data.earliestStartMinute,
        latestEndMinute: parsed.data.latestEndMinute,
        preferredStartMinute: parsed.data.preferredStartMinute,
      },
    });
    await tx.groupTeacher.upsert({
      where: {
        groupId_teacherId: {
          groupId: group.id,
          teacherId: teacher.id,
        },
      },
      update: { archivedAt: null, isPrimary: true },
      create: {
        groupId: group.id,
        teacherId: teacher.id,
        isPrimary: true,
      },
    });
    await tx.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action: "schedule.requirement.saved",
        entityType: "CourseGroup",
        entityId: group.id,
        metadata: {
          lessonsPerWeek: parsed.data.lessonsPerWeek,
          durationMinutes: parsed.data.durationMinutes,
          allowedWeekdays: parsed.data.allowedWeekdays,
        },
      },
    });
  });

  revalidatePath(schedulePath);
  return {
    status: "success",
    message: "Wymagania grupy zostały zapisane.",
  };
}

export async function saveTeacherAvailabilityAction(
  _previous: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const session = await requireDirector(schedulePath);
  const parsed = teacherAvailabilitySchema.safeParse({
    teacherId: formData.get("teacherId"),
    weekdays: formData.getAll("weekdays"),
    startMinute: minuteValue(formData.get("startTime")),
    endMinute: minuteValue(formData.get("endTime")),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Sprawdź dostępność wykładowcy.",
    };
  }
  const teacher = await db.user.findFirst({
    where: {
      id: parsed.data.teacherId,
      schoolId: session.user.schoolId,
      role: "TEACHER",
      status: "ACTIVE",
      archivedAt: null,
    },
    select: { id: true },
  });
  if (!teacher) {
    return {
      status: "error",
      message: "Ten wykładowca nie jest już aktywny.",
    };
  }

  await db.$transaction(async (tx) => {
    await tx.availabilityWindow.deleteMany({
      where: {
        schoolId: session.user.schoolId,
        teacherId: teacher.id,
      },
    });
    await tx.availabilityWindow.createMany({
      data: parsed.data.weekdays.map((weekday) => ({
        schoolId: session.user.schoolId,
        teacherId: teacher.id,
        weekday,
        startMinute: parsed.data.startMinute,
        endMinute: parsed.data.endMinute,
        isAvailable: true,
      })),
    });
    await tx.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action: "schedule.teacher-availability.saved",
        entityType: "User",
        entityId: teacher.id,
        metadata: {
          weekdays: parsed.data.weekdays,
          startMinute: parsed.data.startMinute,
          endMinute: parsed.data.endMinute,
        },
      },
    });
  });
  revalidatePath(schedulePath);
  return {
    status: "success",
    message: "Dostępność wykładowcy została zapisana.",
  };
}

export async function generateScheduleAction(formData: FormData) {
  const session = await requireDirector(schedulePath);
  const weekStart = getWeekStartKey(String(formData.get("weekStart") ?? ""));
  const weekStartAt = fromZonedTime(
    `${weekStart}T00:00:00`,
    SCHOOL_TIME_ZONE,
  );
  const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);
  const weekEndAt = addDays(weekStartAt, 7);

  const [requirements, rooms, teachers, availability, fixedSlots] =
    await Promise.all([
      db.schedulingRequirement.findMany({
        where: {
          schoolId: session.user.schoolId,
          isActive: true,
          group: { isActive: true, archivedAt: null },
        },
        include: {
          group: {
            select: {
              name: true,
              enrollments: {
                where: { status: "ACTIVE" },
                select: { studentId: true },
              },
            },
          },
        },
      }),
      db.room.findMany({
        where: {
          schoolId: session.user.schoolId,
          isActive: true,
          archivedAt: null,
        },
        select: { id: true, name: true, capacity: true },
      }),
      db.user.findMany({
        where: {
          schoolId: session.user.schoolId,
          role: "TEACHER",
          status: "ACTIVE",
          archivedAt: null,
        },
        select: { id: true, name: true },
      }),
      db.availabilityWindow.findMany({
        where: { schoolId: session.user.schoolId },
        select: {
          teacherId: true,
          roomId: true,
          groupId: true,
          weekday: true,
          startMinute: true,
          endMinute: true,
          isAvailable: true,
          preference: true,
        },
      }),
      db.scheduleSlot.findMany({
        where: {
          schoolId: session.user.schoolId,
          archivedAt: null,
          status: { not: "CANCELLED" },
          startAt: { lt: weekEndAt },
          endAt: { gt: weekStartAt },
        },
        include: {
          group: {
            select: {
              enrollments: {
                where: { status: "ACTIVE" },
                select: { studentId: true },
              },
            },
          },
        },
      }),
    ]);

  const existingCounts = new Map<string, number>();
  for (const slot of fixedSlots) {
    existingCounts.set(
      slot.groupId,
      (existingCounts.get(slot.groupId) ?? 0) + 1,
    );
  }
  const result = deterministicScheduleSolver.solve({
    weekStart,
    requirements: requirements
      .map((requirement) => ({
        id: requirement.id,
        groupId: requirement.groupId,
        groupName: requirement.group.name,
        studentIds: requirement.group.enrollments.map(
          (enrollment) => enrollment.studentId,
        ),
        teacherId: requirement.teacherId,
        preferredRoomId: requirement.preferredRoomId,
        lessonsPerWeek: Math.max(
          0,
          requirement.lessonsPerWeek -
            (existingCounts.get(requirement.groupId) ?? 0),
        ),
        durationMinutes: requirement.durationMinutes,
        allowedWeekdays: requirement.allowedWeekdays,
        preferredWeekdays: requirement.preferredWeekdays,
        earliestStartMinute: requirement.earliestStartMinute,
        latestEndMinute: requirement.latestEndMinute,
        preferredStartMinute: requirement.preferredStartMinute,
      }))
      .filter((requirement) => requirement.lessonsPerWeek > 0),
    rooms,
    teachers,
    availability,
    fixedSlots: fixedSlots.map((slot) => ({
      id: slot.id,
      groupId: slot.groupId,
      roomId: slot.roomId,
      teacherId: slot.teacherId,
      startAt: slot.startAt,
      endAt: slot.endAt,
      studentIds: slot.group.enrollments.map(
        (enrollment) => enrollment.studentId,
      ),
    })),
  });

  const generation = await db.scheduleGeneration.create({
    data: {
      schoolId: session.user.schoolId,
      createdById: session.user.id,
      weekStart: weekStartDate,
      status: "READY",
      score: result.score,
      summary: {
        hardViolations: result.hardViolations,
        suggestions: result.suggestions,
        exploredNodes: result.exploredNodes,
        existingSlots: fixedSlots.length,
      },
      proposals: {
        create: result.proposals.map((proposal) => ({
          groupId: proposal.groupId,
          roomId: proposal.roomId,
          teacherId: proposal.teacherId,
          startAt: proposal.startAt,
          endAt: proposal.endAt,
          score: proposal.score,
          explanation: proposal.explanation,
        })),
      },
    },
    select: { id: true },
  });
  await db.auditLog.create({
    data: {
      schoolId: session.user.schoolId,
      actorId: session.user.id,
      action: "schedule.generation.created",
      entityType: "ScheduleGeneration",
      entityId: generation.id,
      metadata: {
        weekStart,
        proposalCount: result.proposals.length,
        unresolvedCount: result.hardViolations.length,
      },
    },
  });

  redirect(
    `${schedulePath}?tydzien=${weekStart}&propozycja=${generation.id}`,
  );
}

export async function applyScheduleGenerationAction(formData: FormData) {
  const session = await requireDirector(schedulePath);
  const generationId = String(formData.get("generationId") ?? "");
  const generation = await db.scheduleGeneration.findFirst({
    where: {
      id: generationId,
      schoolId: session.user.schoolId,
      status: "READY",
    },
    include: {
      proposals: {
        include: {
          group: {
            select: {
              enrollments: {
                where: { status: "ACTIVE" },
                select: { studentId: true },
              },
            },
          },
        },
        orderBy: { startAt: "asc" },
      },
    },
  });
  if (!generation) {
    redirect(`${schedulePath}?blad=propozycja-niedostepna`);
  }
  const summary = generation.summary as {
    hardViolations?: unknown[];
  };
  if ((summary.hardViolations?.length ?? 0) > 0) {
    redirect(`${schedulePath}?blad=propozycja-niepelna`);
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${session.user.schoolId}))`;
      for (const proposal of generation.proposals) {
        const studentIds = proposal.group.enrollments.map(
          (enrollment) => enrollment.studentId,
        );
        const conflict = await tx.scheduleSlot.findFirst({
          where: {
            schoolId: session.user.schoolId,
            archivedAt: null,
            status: { not: "CANCELLED" },
            startAt: { lt: proposal.endAt },
            endAt: { gt: proposal.startAt },
            OR: [
              { groupId: proposal.groupId },
              { roomId: proposal.roomId },
              { teacherId: proposal.teacherId },
              ...(studentIds.length
                ? [
                    {
                      group: {
                        enrollments: {
                          some: {
                            status: "ACTIVE" as const,
                            studentId: { in: studentIds },
                          },
                        },
                      },
                    },
                  ]
                : []),
            ],
          },
          select: { id: true },
        });
        if (conflict) {
          throw new Error("schedule-conflict");
        }
        await tx.scheduleSlot.create({
          data: {
            schoolId: session.user.schoolId,
            groupId: proposal.groupId,
            roomId: proposal.roomId,
            teacherId: proposal.teacherId,
            createdById: session.user.id,
            startAt: proposal.startAt,
            endAt: proposal.endAt,
            timeZone: SCHOOL_TIME_ZONE,
            generationId: generation.id,
          },
        });
      }
      await tx.scheduleGeneration.update({
        where: { id: generation.id },
        data: { status: "APPLIED", appliedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          schoolId: session.user.schoolId,
          actorId: session.user.id,
          action: "schedule.generation.applied",
          entityType: "ScheduleGeneration",
          entityId: generation.id,
          metadata: { proposalCount: generation.proposals.length },
        },
      });
    });
  } catch {
    redirect(
      `${schedulePath}?tydzien=${generation.weekStart
        .toISOString()
        .slice(0, 10)}&propozycja=${generation.id}&blad=kolizja`,
    );
  }

  revalidatePath(schedulePath);
  redirect(
    `${schedulePath}?tydzien=${generation.weekStart
      .toISOString()
      .slice(0, 10)}&sukces=opublikowano`,
  );
}
