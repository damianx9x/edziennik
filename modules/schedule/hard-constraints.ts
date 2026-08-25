import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import type { Prisma } from "@/app/generated/prisma/client";

import { SCHOOL_TIME_ZONE } from "./schema";

type ScheduleConstraintClient = Pick<
  Prisma.TransactionClient,
  | "availabilityWindow"
  | "studentAvailabilityWindow"
  | "locationTravelRule"
  | "courseGroup"
  | "enrollment"
  | "room"
  | "scheduleSlot"
  | "user"
>;

export type ScheduleResources = {
  groupId: string;
  roomId: string;
  teacherId: string;
};

export type ScheduleConstraintInput = ScheduleResources & {
  schoolId: string;
  startAt: Date;
  endAt: Date;
  excludeId?: string;
  timeZone?: string;
};

type AvailabilityWindow = {
  weekday: number;
  startMinute: number;
  endMinute: number;
  isAvailable: boolean;
  preference?: number;
  locationId?: string | null;
};

type Conflict = ScheduleResources & {
  group: { name: string };
  room: { name: string };
  teacher: { name: string };
  studentConflict?: boolean;
};

export type ScheduleConstraintCode =
  | "INVALID_INTERVAL"
  | "RESOURCE_UNAVAILABLE"
  | "LOCATION_UNAVAILABLE"
  | "LOCATION_MISMATCH"
  | "ROOM_CAPACITY"
  | "TEACHER_UNAVAILABLE"
  | "STUDENT_UNAVAILABLE"
  | "TRAVEL_TIME"
  | "SCHEDULE_CONFLICT";

export class ScheduleConstraintError extends Error {
  constructor(
    readonly code: ScheduleConstraintCode,
    message: string,
  ) {
    super(message);
    this.name = "ScheduleConstraintError";
  }
}

function localInterval(
  startAt: Date,
  endAt: Date,
  timeZone: string,
) {
  const localStart = toZonedTime(startAt, timeZone);
  const localEnd = toZonedTime(endAt, timeZone);
  const startDay = format(localStart, "yyyy-MM-dd");
  const endDay = format(localEnd, "yyyy-MM-dd");
  const jsWeekday = localStart.getDay();

  return {
    sameDay: startDay === endDay,
    weekday: jsWeekday === 0 ? 7 : jsWeekday,
    startMinute: localStart.getHours() * 60 + localStart.getMinutes(),
    endMinute: localEnd.getHours() * 60 + localEnd.getMinutes(),
  };
}

export function evaluateConfiguredAvailability(
  windows: AvailabilityWindow[],
  input: {
    weekday: number;
    startMinute: number;
    endMinute: number;
    locationId?: string;
  },
) {
  if (windows.length === 0) {
    return { allowed: true, preference: 0 };
  }

  const windowsForDay = windows.filter(
    (window) =>
      window.weekday === input.weekday &&
      (!input.locationId || !window.locationId || window.locationId === input.locationId),
  );
  const overlapsBlockedWindow = windowsForDay.some(
    (window) =>
      !window.isAvailable &&
      window.startMinute < input.endMinute &&
      window.endMinute > input.startMinute,
  );
  if (overlapsBlockedWindow) {
    return { allowed: false, preference: 0 };
  }

  const configuredAvailableWindows = windows.filter(
    (window) => window.isAvailable,
  );
  if (configuredAvailableWindows.length === 0) {
    return { allowed: true, preference: 0 };
  }

  const containing = windowsForDay.filter(
    (window) =>
      window.isAvailable &&
      window.startMinute <= input.startMinute &&
      window.endMinute >= input.endMinute,
  );
  return {
    allowed: containing.length > 0,
    preference: containing.reduce(
      (total, window) => total + (window.preference ?? 0),
      0,
    ),
  };
}

export function fitsConfiguredAvailability(
  windows: AvailabilityWindow[],
  input: {
    startAt: Date;
    endAt: Date;
    timeZone?: string;
    locationId?: string;
  },
) {
  const interval = localInterval(
    input.startAt,
    input.endAt,
    input.timeZone ?? SCHOOL_TIME_ZONE,
  );
  if (!interval.sameDay) {
    return false;
  }

  return evaluateConfiguredAvailability(windows, {
    ...interval,
    locationId: input.locationId,
  }).allowed;
}

function conflictMessage(
  conflict: Conflict,
  resources: ScheduleResources,
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

async function assertActiveResources(
  tx: ScheduleConstraintClient,
  input: ScheduleConstraintInput,
) {
  const [group, room, teacher, teacherAvailability] = await Promise.all([
    tx.courseGroup.findFirst({
      where: {
        id: input.groupId,
        schoolId: input.schoolId,
        isActive: true,
        archivedAt: null,
      },
      select: {
        id: true,
        name: true,
        locationId: true,
        location: {
          select: {
            schoolId: true,
            isActive: true,
            archivedAt: true,
            isOnline: true,
            name: true,
          },
        },
        enrollments: {
          where: { status: "ACTIVE" },
          select: { studentId: true },
        },
      },
    }),
    tx.room.findFirst({
      where: {
        id: input.roomId,
        schoolId: input.schoolId,
        isActive: true,
        archivedAt: null,
      },
      select: {
        id: true,
        name: true,
        capacity: true,
        locationId: true,
        location: {
          select: {
            schoolId: true,
            isActive: true,
            archivedAt: true,
          },
        },
      },
    }),
    tx.user.findFirst({
      where: {
        id: input.teacherId,
        schoolId: input.schoolId,
        role: "TEACHER",
        status: "ACTIVE",
        archivedAt: null,
      },
      select: { id: true, name: true },
    }),
    tx.availabilityWindow.findMany({
      where: {
        schoolId: input.schoolId,
        teacherId: input.teacherId,
      },
      select: {
        weekday: true,
        startMinute: true,
        endMinute: true,
        isAvailable: true,
        locationId: true,
      },
    }),
  ]);

  if (!group || !room || !teacher) {
    throw new ScheduleConstraintError(
      "RESOURCE_UNAVAILABLE",
      "Wybrana sala, grupa lub wykładowca nie jest już dostępny. Odśwież stronę.",
    );
  }

  if (
    group.location.schoolId !== input.schoolId ||
    room.location.schoolId !== input.schoolId ||
    !group.location.isActive ||
    !room.location.isActive ||
    group.location.archivedAt ||
    room.location.archivedAt
  ) {
    throw new ScheduleConstraintError(
      "LOCATION_UNAVAILABLE",
      "Lokalizacja grupy lub sali nie jest już dostępna. Odśwież stronę.",
    );
  }

  if (group.locationId !== room.locationId) {
    throw new ScheduleConstraintError(
      "LOCATION_MISMATCH",
      "Grupa i sala należą do różnych lokalizacji. Wybierz salę z oddziału grupy.",
    );
  }

  if (
    room.capacity !== null &&
    group.enrollments.length > room.capacity
  ) {
    throw new ScheduleConstraintError(
      "ROOM_CAPACITY",
      `Sala „${room.name}” ma ${room.capacity} miejsc, a grupa „${group.name}” ma ${group.enrollments.length} aktywnych uczniów. Wybierz większą salę.`,
    );
  }

  if (
    !fitsConfiguredAvailability(teacherAvailability, {
      startAt: input.startAt,
      endAt: input.endAt,
      timeZone: input.timeZone,
      locationId: group.locationId,
    })
  ) {
    throw new ScheduleConstraintError(
      "TEACHER_UNAVAILABLE",
      `Wykładowca ${teacher.name} nie jest dostępny w tym terminie. Wybierz termin zgodny z jego dostępnością.`,
    );
  }

  const studentIds = group.enrollments.map((enrollment) => enrollment.studentId);
  const studentAvailability = studentIds.length
    ? await tx.studentAvailabilityWindow.findMany({
        where: { schoolId: input.schoolId, studentId: { in: studentIds } },
        select: {
          studentId: true,
          weekday: true,
          startMinute: true,
          endMinute: true,
        },
      })
    : [];
  const unavailableStudent = studentIds.some((studentId) => {
    const windows = studentAvailability.filter(
      (window) => window.studentId === studentId,
    ).map((window) => ({ ...window, isAvailable: true }));
    return !fitsConfiguredAvailability(windows, {
      startAt: input.startAt,
      endAt: input.endAt,
      timeZone: input.timeZone,
    });
  });
  if (unavailableStudent) {
    throw new ScheduleConstraintError(
      "STUDENT_UNAVAILABLE",
      "Co najmniej jeden uczeń w tej grupie oznaczył ten termin jako niedostępny. Wybierz wspólny termin albo zmień jego preferencje w kartotece.",
    );
  }

  return {
    locationId: group.locationId,
    locationName: group.location.name,
    locationIsOnline: group.location.isOnline,
    teacherName: teacher.name,
  };
}

async function assertTeacherTravelTime(
  tx: ScheduleConstraintClient,
  input: ScheduleConstraintInput,
  resource: Awaited<ReturnType<typeof assertActiveResources>>,
) {
  const adjacent = await tx.scheduleSlot.findMany({
    where: {
      id: input.excludeId ? { not: input.excludeId } : undefined,
      schoolId: input.schoolId,
      teacherId: input.teacherId,
      archivedAt: null,
      status: { not: "CANCELLED" },
      OR: [
        { endAt: { lte: input.startAt } },
        { startAt: { gte: input.endAt } },
      ],
    },
    orderBy: { startAt: "asc" },
    select: {
      startAt: true,
      endAt: true,
      group: { select: { location: { select: { id: true, name: true, isOnline: true } } } },
    },
  });
  const previous = adjacent.filter((slot) => slot.endAt <= input.startAt).at(-1);
  const next = adjacent.find((slot) => slot.startAt >= input.endAt);
  for (const [from, to, gap] of [
    previous
      ? [previous.group.location, { id: resource.locationId, name: resource.locationName, isOnline: resource.locationIsOnline }, Math.round((input.startAt.getTime() - previous.endAt.getTime()) / 60_000)]
      : null,
    next
      ? [{ id: resource.locationId, name: resource.locationName, isOnline: resource.locationIsOnline }, next.group.location, Math.round((next.startAt.getTime() - input.endAt.getTime()) / 60_000)]
      : null,
  ].filter(Boolean) as Array<[{ id: string; name: string; isOnline: boolean }, { id: string; name: string; isOnline: boolean }, number]>) {
    if (from.id === to.id || from.isOnline || to.isOnline) continue;
    const rule = await tx.locationTravelRule.findFirst({
      where: { schoolId: input.schoolId, fromLocationId: from.id, toLocationId: to.id, isActive: true },
      select: { minutes: true },
    });
    const required = rule?.minutes ?? 30;
    if (gap < required) {
      throw new ScheduleConstraintError(
        "TRAVEL_TIME",
        `${resource.teacherName} potrzebuje co najmniej ${required} min na przejazd z „${from.name}” do „${to.name}”. Między lekcjami jest tylko ${gap} min.`,
      );
    }
  }
}

async function findConflict(
  tx: ScheduleConstraintClient,
  input: ScheduleConstraintInput,
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

export async function assertScheduleSlotCanBeSaved(
  tx: ScheduleConstraintClient,
  input: ScheduleConstraintInput,
) {
  if (
    !Number.isFinite(input.startAt.getTime()) ||
    !Number.isFinite(input.endAt.getTime()) ||
    input.startAt >= input.endAt
  ) {
    throw new ScheduleConstraintError(
      "INVALID_INTERVAL",
      "Termin zajęć jest nieprawidłowy. Wybierz inną godzinę.",
    );
  }

  const activeResource = await assertActiveResources(tx, input);
  await assertTeacherTravelTime(tx, input, activeResource);
  const conflict = await findConflict(tx, input);
  if (conflict) {
    throw new ScheduleConstraintError(
      "SCHEDULE_CONFLICT",
      conflictMessage(conflict, input),
    );
  }
}
