"use server";

import { addDays, format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/server/db";
import { requireActiveSession, requireDirector } from "@/modules/identity/auth/session";
import { isPrivilegedIdentityRole } from "@/modules/identity/auth/access";

import {
  assertScheduleSlotCanBeSaved,
  ScheduleConstraintError,
} from "./hard-constraints";
import {
  discardReadyScheduleGenerations,
  lockScheduleResources,
} from "./resource-lock";
import {
  getWeekStartKey,
  SCHOOL_TIME_ZONE,
  scheduleGenerationSchema,
  schedulingRequirementSchema,
  teacherAvailabilitySchema,
} from "./schema";
import { deterministicScheduleSolver } from "./solver";
import type { ScheduleActionState } from "./types";

const schedulePath = "/panel/plan";

class ScheduleGenerationNotReadyError extends Error {
  constructor() {
    super("Schedule generation is no longer ready.");
    this.name = "ScheduleGenerationNotReadyError";
  }
}

function publicationFailureCode(error: unknown) {
  if (error instanceof ScheduleGenerationNotReadyError) {
    return "propozycja-niedostepna";
  }
  if (error instanceof ScheduleConstraintError) {
    return error.code === "SCHEDULE_CONFLICT"
      ? "kolizja"
      : "ograniczenia";
  }
  return "publikacja";
}

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
      select: { id: true, locationId: true },
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
      select: { id: true, locationId: true },
    }),
  ]);
  if (!group || !teacher || !room) {
    return {
      status: "error",
      message: "Grupa, wykładowca lub sala nie są już aktywne.",
    };
  }
  if (group.locationId !== room.locationId) {
    return {
      status: "error",
      message:
        "Preferowana sala musi należeć do tej samej lokalizacji co grupa.",
    };
  }

  const transactionResult = await db.$transaction(async (tx) => {
    await lockScheduleResources(tx, session.user.schoolId);
    const [currentGroup, currentTeacher, currentRoom] = await Promise.all([
      tx.courseGroup.findFirst({
        where: {
          id: group.id,
          schoolId: session.user.schoolId,
          isActive: true,
          archivedAt: null,
        },
        select: { id: true, locationId: true },
      }),
      tx.user.findFirst({
        where: {
          id: teacher.id,
          schoolId: session.user.schoolId,
          role: "TEACHER",
          status: "ACTIVE",
          archivedAt: null,
        },
        select: { id: true },
      }),
      tx.room.findFirst({
        where: {
          id: room.id,
          schoolId: session.user.schoolId,
          isActive: true,
          archivedAt: null,
        },
        select: { id: true, locationId: true },
      }),
    ]);
    if (!currentGroup || !currentTeacher || !currentRoom) {
      return {
        error: "Grupa, wykładowca lub sala nie są już aktywne.",
      };
    }
    if (currentGroup.locationId !== currentRoom.locationId) {
      return {
        error:
          "Preferowana sala musi należeć do tej samej lokalizacji co grupa.",
      };
    }

    await tx.schedulingRequirement.upsert({
      where: { groupId: currentGroup.id },
      update: {
        schoolId: session.user.schoolId,
        teacherId: currentTeacher.id,
        preferredRoomId: currentRoom.id,
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
        groupId: currentGroup.id,
        teacherId: currentTeacher.id,
        preferredRoomId: currentRoom.id,
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
          groupId: currentGroup.id,
          teacherId: currentTeacher.id,
        },
      },
      update: { archivedAt: null, isPrimary: true },
      create: {
        groupId: currentGroup.id,
        teacherId: currentTeacher.id,
        isPrimary: true,
      },
    });
    const discardedGenerationCount =
      await discardReadyScheduleGenerations(tx, session.user.schoolId);
    await tx.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action: "schedule.requirement.saved",
        entityType: "CourseGroup",
        entityId: currentGroup.id,
        metadata: {
          lessonsPerWeek: parsed.data.lessonsPerWeek,
          durationMinutes: parsed.data.durationMinutes,
          allowedWeekdays: parsed.data.allowedWeekdays,
          discardedGenerationCount,
        },
      },
    });
    return { error: null };
  });
  if (transactionResult.error) {
    return { status: "error", message: transactionResult.error };
  }

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
  const session = await requireActiveSession(schedulePath);
  const weekdays = formData.getAll("windowWeekday");
  const starts = formData.getAll("windowStart");
  const ends = formData.getAll("windowEnd");
  const locationIds = formData.getAll("windowLocationId");
  const windows = weekdays.map((weekday, index) => ({
    weekday,
    startMinute: minuteValue(starts[index] ?? null),
    endMinute: minuteValue(ends[index] ?? null),
    locationId: locationIds[index],
  }));
  const parsed = teacherAvailabilitySchema.safeParse({
    teacherId: formData.get("teacherId"),
    windows,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Sprawdź dostępność wykładowcy.",
    };
  }
  if (
    session.user.role === "TEACHER" &&
    parsed.data.teacherId !== session.user.id
  ) {
    return { status: "error", message: "Możesz zmienić tylko własną dostępność." };
  }
  if (!(isPrivilegedIdentityRole(session.user.role) || session.user.role === "TEACHER")) {
    return { status: "error", message: "Nie masz dostępu do tej operacji." };
  }
  const [teacher, locations] = await Promise.all([
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
    db.location.findMany({
      where: {
        schoolId: session.user.schoolId,
        id: { in: parsed.data.windows.map((window) => window.locationId) },
        isActive: true,
        archivedAt: null,
      },
      select: { id: true },
    }),
  ]);
  if (!teacher || locations.length !== new Set(parsed.data.windows.map((window) => window.locationId)).size) {
    return {
      status: "error",
      message: "Wykładowca albo jedna z lokalizacji nie są już aktywne.",
    };
  }

  const transactionResult = await db.$transaction(async (tx) => {
    await lockScheduleResources(tx, session.user.schoolId);
    const currentTeacher = await tx.user.findFirst({
      where: {
        id: teacher.id,
        schoolId: session.user.schoolId,
        role: "TEACHER",
        status: "ACTIVE",
        archivedAt: null,
      },
      select: { id: true },
    });
    if (!currentTeacher) {
      return { error: "Ten wykładowca nie jest już aktywny." };
    }
    await tx.availabilityWindow.deleteMany({
      where: {
        schoolId: session.user.schoolId,
        teacherId: currentTeacher.id,
      },
    });
    await tx.availabilityWindow.createMany({
      data: parsed.data.windows.map((window) => ({
        schoolId: session.user.schoolId,
        teacherId: currentTeacher.id,
        weekday: window.weekday,
        startMinute: window.startMinute,
        endMinute: window.endMinute,
        locationId: window.locationId,
        isAvailable: true,
      })),
    });
    const discardedGenerationCount =
      await discardReadyScheduleGenerations(tx, session.user.schoolId);
    await tx.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action: "schedule.teacher-availability.saved",
        entityType: "User",
        entityId: currentTeacher.id,
        metadata: {
          windows: parsed.data.windows,
          discardedGenerationCount,
        },
      },
    });
    return { error: null };
  });
  if (transactionResult.error) {
    return { status: "error", message: transactionResult.error };
  }
  revalidatePath(schedulePath);
  return {
    status: "success",
    message: "Dostępność wykładowcy została zapisana.",
  };
}

export async function generateScheduleAction(formData: FormData) {
  const session = await requireDirector(schedulePath);
  const parsed = scheduleGenerationSchema.safeParse({
    scope: formData.get("scope"),
    targetId: formData.get("targetId") || undefined,
    rangeStart: formData.get("rangeStart"),
    rangeEnd: formData.get("rangeEnd"),
  });
  if (!parsed.success) {
    redirect(`${schedulePath}?blad=zakres`);
  }
  const { scope, targetId, rangeStart, rangeEnd } = parsed.data;
  const firstWeek = getWeekStartKey(rangeStart);
  const rangeStartAt = fromZonedTime(
    `${rangeStart}T00:00:00`,
    SCHOOL_TIME_ZONE,
  );
  const rangeEndAt = addDays(
    fromZonedTime(`${rangeEnd}T00:00:00`, SCHOOL_TIME_ZONE),
    1,
  );

  const [requirements, rooms, teachers, availability, studentAvailability, fixedSlots, locations, travelRules] =
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
              locationId: true,
              location: { select: { name: true } },
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
        select: { id: true, name: true, capacity: true, locationId: true },
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
          locationId: true,
        },
      }),
      db.studentAvailabilityWindow.findMany({
        where: { schoolId: session.user.schoolId },
        select: {
          studentId: true,
          weekday: true,
          startMinute: true,
          endMinute: true,
          preference: true,
        },
      }),
      db.scheduleSlot.findMany({
        where: {
          schoolId: session.user.schoolId,
          archivedAt: null,
          status: { not: "CANCELLED" },
          startAt: { lt: rangeEndAt },
          endAt: { gt: rangeStartAt },
        },
        include: {
          group: {
            select: {
              locationId: true,
              enrollments: {
                where: { status: "ACTIVE" },
                select: { studentId: true },
              },
            },
          },
        },
      }),
      db.location.findMany({
        where: {
          schoolId: session.user.schoolId,
          isActive: true,
          archivedAt: null,
        },
        select: { id: true, name: true, isOnline: true },
      }),
      db.locationTravelRule.findMany({
        where: { schoolId: session.user.schoolId, isActive: true },
        select: { fromLocationId: true, toLocationId: true, minutes: true },
      }),
    ]);

  let scopedRequirements = requirements;
  let scopedRooms = rooms;
  let scopeLabel = "Cała szkoła";
  if (scope === "LOCATION") {
    scopedRequirements = requirements.filter(
      (requirement) => requirement.group.locationId === targetId,
    );
    scopedRooms = rooms.filter((room) => room.locationId === targetId);
    scopeLabel =
      locations.find((location) => location.id === targetId)?.name ??
      "Wybrana lokalizacja";
  } else if (scope === "GROUP") {
    scopedRequirements = requirements.filter(
      (requirement) => requirement.groupId === targetId,
    );
    scopeLabel =
      scopedRequirements[0]?.group.name ?? "Wybrana grupa";
  } else if (scope === "TEACHER") {
    scopedRequirements = requirements.filter(
      (requirement) => requirement.teacherId === targetId,
    );
    scopeLabel =
      teachers.find((teacher) => teacher.id === targetId)?.name ??
      "Wybrany wykładowca";
  } else if (scope === "ROOM") {
    scopedRequirements = requirements.filter(
      (requirement) => requirement.preferredRoomId === targetId,
    );
    scopedRooms = rooms.filter((room) => room.id === targetId);
    scopeLabel =
      rooms.find((room) => room.id === targetId)?.name ?? "Wybrana sala";
  }
  if (
    scopedRequirements.length === 0 ||
    scopedRooms.length === 0 ||
    (scope !== "SCHOOL" && !targetId)
  ) {
    redirect(`${schedulePath}?blad=brak-zakresu`);
  }

  const proposals: ReturnType<
    typeof deterministicScheduleSolver.solve
  >["proposals"] = [];
  const hardViolations: string[] = [];
  const suggestions = new Set<string>();
  let score = 0;
  let exploredNodes = 0;
  let weekStart = firstWeek;

  while (weekStart <= rangeEnd) {
    const weekStartAt = fromZonedTime(
      `${weekStart}T00:00:00`,
      SCHOOL_TIME_ZONE,
    );
    const weekEndAt = addDays(weekStartAt, 7);
    const weekFixedSlots = fixedSlots.filter(
      (slot) => slot.startAt < weekEndAt && slot.endAt > weekStartAt,
    );
    const existingCounts = new Map<string, number>();
    for (const slot of weekFixedSlots) {
      existingCounts.set(
        slot.groupId,
        (existingCounts.get(slot.groupId) ?? 0) + 1,
      );
    }
    const result = deterministicScheduleSolver.solve({
      weekStart,
      rangeStart,
      rangeEnd,
      requirements: scopedRequirements
        .map((requirement) => ({
          id: requirement.id,
          groupId: requirement.groupId,
          groupName: requirement.group.name,
          locationId: requirement.group.locationId,
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
      rooms: scopedRooms,
      teachers,
      availability: [
        ...availability,
        ...studentAvailability.map((window) => ({
          ...window,
          teacherId: null,
          roomId: null,
          groupId: null,
          isAvailable: true,
        })),
      ],
      fixedSlots: weekFixedSlots.map((slot) => ({
        id: slot.id,
        groupId: slot.groupId,
        roomId: slot.roomId,
        teacherId: slot.teacherId,
        startAt: slot.startAt,
        endAt: slot.endAt,
        studentIds: slot.group.enrollments.map(
          (enrollment) => enrollment.studentId,
        ),
        locationId: slot.group.locationId,
      })),
      travelRules,
      onlineLocationIds: locations.filter((location) => location.isOnline).map((location) => location.id),
    });
    proposals.push(...result.proposals);
    hardViolations.push(
      ...result.hardViolations.map(
        (violation) => `${weekStart}: ${violation}`,
      ),
    );
    result.suggestions.forEach((suggestion) => suggestions.add(suggestion));
    score += result.score;
    exploredNodes += result.exploredNodes;
    weekStart = format(
      addDays(new Date(`${weekStart}T12:00:00.000Z`), 7),
      "yyyy-MM-dd",
    );
  }

  const generation = await db.scheduleGeneration.create({
    data: {
      schoolId: session.user.schoolId,
      createdById: session.user.id,
      weekStart: new Date(`${firstWeek}T00:00:00.000Z`),
      status: "READY",
      score,
      summary: {
        hardViolations,
        suggestions: [...suggestions],
        exploredNodes,
        existingSlots: fixedSlots.length,
        scope,
        scopeLabel,
        rangeStart,
        rangeEnd,
      },
      proposals: {
        create: proposals.map((proposal) => ({
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
        scope,
        targetId: targetId ?? null,
        rangeStart,
        rangeEnd,
        proposalCount: proposals.length,
        unresolvedCount: hardViolations.length,
      },
    },
  });

  redirect(
    `${schedulePath}?tydzien=${firstWeek}&tryb=auto&propozycja=${generation.id}`,
  );
}

export async function applyScheduleGenerationAction(formData: FormData) {
  const session = await requireDirector(schedulePath);
  const generationId = String(formData.get("generationId") ?? "");
  const allowPartial = formData.get("allowPartial") === "yes";
  const generation = await db.scheduleGeneration.findFirst({
    where: {
      id: generationId,
      schoolId: session.user.schoolId,
      status: "READY",
    },
    include: {
      proposals: {
        orderBy: { startAt: "asc" },
      },
    },
  });
  if (!generation) {
    redirect(`${schedulePath}?blad=propozycja-niedostepna`);
  }
  const summary = generation.summary as {
    hardViolations?: unknown[];
    rangeStart?: string;
  };
  if ((summary.hardViolations?.length ?? 0) > 0 && !allowPartial) {
    redirect(`${schedulePath}?blad=propozycja-niepelna`);
  }

  try {
    await db.$transaction(async (tx) => {
      await lockScheduleResources(tx, session.user.schoolId);
      const readyGeneration = await tx.scheduleGeneration.findFirst({
        where: {
          id: generation.id,
          schoolId: session.user.schoolId,
          status: "READY",
        },
        select: { id: true },
      });
      if (!readyGeneration) {
        throw new ScheduleGenerationNotReadyError();
      }
      for (const proposal of generation.proposals) {
        await assertScheduleSlotCanBeSaved(tx, {
          schoolId: session.user.schoolId,
          groupId: proposal.groupId,
          roomId: proposal.roomId,
          teacherId: proposal.teacherId,
          startAt: proposal.startAt,
          endAt: proposal.endAt,
          timeZone: SCHOOL_TIME_ZONE,
        });
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
          metadata: {
            proposalCount: generation.proposals.length,
            partial: allowPartial,
            unresolvedCount: summary.hardViolations?.length ?? 0,
          },
        },
      });
    });
  } catch (error) {
    const failureCode = publicationFailureCode(error);
    if (failureCode === "publikacja") {
      console.error("Schedule generation publication failed.", {
        generationId: generation.id,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }
    redirect(
      `${schedulePath}?tydzien=${
        summary.rangeStart ??
        generation.weekStart.toISOString().slice(0, 10)
      }&propozycja=${generation.id}&blad=${failureCode}`,
    );
  }

  revalidatePath(schedulePath);
  redirect(
    `${schedulePath}?tydzien=${
      summary.rangeStart ?? generation.weekStart.toISOString().slice(0, 10)
    }&sukces=opublikowano`,
  );
}
