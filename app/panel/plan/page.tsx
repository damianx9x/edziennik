import { addDays, addMinutes, addWeeks, differenceInMinutes, format, subMinutes } from "date-fns";
import { pl } from "date-fns/locale";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import {
  CalendarCheck2,
  CalendarRange,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/server/db";
import {
  requireActiveSession,
  requirePanelAccess,
} from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { AvailabilityForm, ScheduleAssistantPanel } from "@/modules/schedule/components/schedule-assistant-panel";
import { ScheduleWorkspace } from "@/modules/schedule/components/schedule-workspace";
import {
  getWeekStartDate,
  getWeekStartKey,
  SCHOOL_TIME_ZONE,
} from "@/modules/schedule/schema";
import type {
  ScheduleGenerationView,
  ScheduleLocation,
  ScheduleRequirementView,
  ScheduleResource,
  ScheduleSlotView,
  TeacherAvailabilityView,
} from "@/modules/schedule/types";
import { resolveRequirementTeacherId } from "@/modules/schedule/requirement-teacher";
import { requireEnabledModule } from "@/modules/module-access/server";

export const metadata: Metadata = { title: "Plan zajęć" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tydzien?: string;
  tryb?: string;
  propozycja?: string;
  blad?: string;
  sukces?: string;
}>;

async function scheduleSession() {
  const current = await requireActiveSession("/panel/plan");
  await requireEnabledModule(current, "schedule");
  if (
    current.user.role === "SYSTEM_OWNER" ||
    current.user.role === "DIRECTOR"
  ) {
    return requirePanelAccess("view:director-dashboard", "/panel/plan");
  }
  if (current.user.role === "TEACHER") {
    return requirePanelAccess("view:teacher-dashboard", "/panel/plan");
  }
  if (current.user.role === "PARENT") {
    return requirePanelAccess("view:parent-dashboard", "/panel/plan");
  }
  return requirePanelAccess("view:student-dashboard", "/panel/plan");
}

function roleHeading(role: string) {
  if (role === "SYSTEM_OWNER" || role === "DIRECTOR") {
    return {
      kicker: "Centrum grafiku",
      title: "Ułóż plan bez kolizji",
      copy: "Asystent przygotuje propozycję, a Ty możesz ją poprawić ręcznie przed publikacją.",
    };
  }
  if (role === "TEACHER") {
    return {
      kicker: "Mój tydzień",
      title: "Plan zajęć",
      copy: "Widzisz tylko lekcje przypisanych grup. Na telefonie wybierz dzień.",
    };
  }
  if (role === "PARENT") {
    return {
      kicker: "Plan dzieci",
      title: "Wszystkie zajęcia w jednym miejscu",
      copy: "Plan łączy lekcje wszystkich dzieci powiązanych z Twoim kontem.",
    };
  }
  return {
    kicker: "Mój plan",
    title: "Co i kiedy mam?",
    copy: "Najbliższe lekcje są pokazane prosto, bez szkolnych ustawień.",
  };
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await scheduleSession();
  const params = await searchParams;
  const weekStartKey = getWeekStartKey(params.tydzien);
  const weekStart = getWeekStartDate(weekStartKey);
  const weekStartAt = fromZonedTime(
    `${weekStartKey}T00:00:00`,
    SCHOOL_TIME_ZONE,
  );
  const weekEndAt = addDays(weekStartAt, 7);
  const isManagement =
    session.user.role === "SYSTEM_OWNER" ||
    session.user.role === "DIRECTOR";
  const isSchoolStaff = isManagement || session.user.role === "TEACHER";
  const mode = isManagement && params.tryb === "auto" ? "assistant" : "manual";

  const groupWhere =
    isManagement
      ? {}
      : session.user.role === "TEACHER"
        ? {
            teachers: {
              some: {
                teacherId: session.user.id,
                archivedAt: null,
              },
            },
          }
        : session.user.role === "PARENT"
          ? {
              enrollments: {
                some: {
                  status: "ACTIVE" as const,
                  student: {
                    childLinks: {
                      some: {
                        parentId: session.user.id,
                        archivedAt: null,
                      },
                    },
                  },
                },
              },
            }
          : {
              enrollments: {
                some: {
                  studentId: session.user.id,
                  status: "ACTIVE" as const,
                },
              },
            };

  const groupsRaw = await db.courseGroup.findMany({
    where: {
      schoolId: session.user.schoolId,
      isActive: true,
      archivedAt: null,
      ...groupWhere,
    },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        select: { studentId: true },
      },
      teachers: {
        where: { archivedAt: null },
        orderBy: [{ isPrimary: "desc" }, { assignedAt: "asc" }],
        select: { teacherId: true, isPrimary: true },
      },
      schedulingRequirement: true,
    },
    orderBy: { name: "asc" },
  });
  const groupIds = groupsRaw.map((group) => group.id);

  const [slotsRaw, roomsRaw, teachersRaw, availabilityRaw, locationsRaw] = await Promise.all([
    db.scheduleSlot.findMany({
      where: {
        schoolId: session.user.schoolId,
        groupId: { in: groupIds },
        archivedAt: null,
        startAt: { lt: weekEndAt },
        endAt: { gt: weekStartAt },
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
        room: { select: { name: true } },
        teacher: { select: { name: true } },
        cancellation: { select: { reason: true, cancelledAt: true } },
        changeRequests: {
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            kind: true,
            reason: true,
            createdAt: true,
            requestedBy: { select: { name: true } },
          },
        },
      },
      orderBy: { startAt: "asc" },
    }),
    db.room.findMany({
      where: {
        schoolId: session.user.schoolId,
        isActive: true,
        archivedAt: null,
      },
      select: { id: true, name: true, capacity: true, locationId: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: {
        schoolId: session.user.schoolId,
        role: "TEACHER",
        status: "ACTIVE",
        archivedAt: null,
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    isSchoolStaff
      ? db.availabilityWindow.findMany({
          where: {
            schoolId: session.user.schoolId,
            teacherId: isManagement ? { not: null } : session.user.id,
            isAvailable: true,
          },
          select: {
            teacherId: true,
            weekday: true,
            startMinute: true,
            endMinute: true,
            locationId: true,
          },
          orderBy: [{ teacherId: "asc" }, { weekday: "asc" }],
        })
      : Promise.resolve([]),
    db.location.findMany({
      where: {
        schoolId: session.user.schoolId,
        isActive: true,
        archivedAt: null,
      },
      orderBy: [{ isOnline: "asc" }, { name: "asc" }],
      select: { id: true, name: true, isOnline: true },
    }),
  ]);

  const visibleLocationIds = new Set(groupsRaw.map((group) => group.locationId));

  const journalEnrollments = await db.enrollment.findMany({
    where: {
      groupId: { in: groupIds },
      status: "ACTIVE",
      ...(isSchoolStaff
        ? {}
        : session.user.role === "PARENT"
          ? {
              student: {
                childLinks: {
                  some: {
                    parentId: session.user.id,
                    archivedAt: null,
                  },
                },
              },
            }
          : { studentId: session.user.id }),
    },
    select: {
      groupId: true,
      studentId: true,
      student: { select: { name: true } },
    },
  });
  const visibleStudentIds = Array.from(
    new Set(journalEnrollments.map((enrollment) => enrollment.studentId)),
  );
  const [attendanceRaw, checkInsRaw] = await Promise.all([
    db.attendanceRecord.findMany({
      where: {
        schoolId: session.user.schoolId,
        scheduleSlotId: { in: slotsRaw.map((slot) => slot.id) },
        studentId: { in: visibleStudentIds },
      },
      select: {
        scheduleSlotId: true,
        studentId: true,
        status: true,
      },
    }),
    db.lessonCheckIn.findMany({
      where: {
        schoolId: session.user.schoolId,
        scheduleSlotId: { in: slotsRaw.map((slot) => slot.id) },
        studentId: { in: visibleStudentIds },
      },
      select: {
        scheduleSlotId: true,
        studentId: true,
        checkedInAt: true,
      },
    }),
  ]);
  const attendanceBySlotAndStudent = new Map(
    attendanceRaw.map((record) => [
      `${record.scheduleSlotId}:${record.studentId}`,
      record.status,
    ]),
  );
  const checkInBySlotAndStudent = new Map(
    checkInsRaw.map((record) => [
      `${record.scheduleSlotId}:${record.studentId}`,
      record.checkedInAt.toISOString(),
    ]),
  );
  const studentsByGroup = new Map<string, typeof journalEnrollments>();
  for (const enrollment of journalEnrollments) {
    const current = studentsByGroup.get(enrollment.groupId) ?? [];
    current.push(enrollment);
    studentsByGroup.set(enrollment.groupId, current);
  }
  for (const students of studentsByGroup.values()) {
    students.sort((first, second) =>
      first.student.name.localeCompare(second.student.name, "pl"),
    );
  }

  const locations: ScheduleLocation[] = locationsRaw.filter(
    (location) => isManagement || visibleLocationIds.has(location.id),
  );
  const groups: ScheduleResource[] = groupsRaw.map((group) => ({
    id: group.id,
    name: group.name,
    locationId: group.locationId,
    locationName:
      locationsRaw.find((location) => location.id === group.locationId)?.name ??
      "Lokalizacja",
    studentIds: isManagement
      ? group.enrollments.map((enrollment) => enrollment.studentId)
      : [],
    teacherIds: group.teachers.map((teacher) => teacher.teacherId),
    preferredRoomId: group.schedulingRequirement?.preferredRoomId ?? null,
  }));
  const visibleRoomIds = new Set(slotsRaw.map((slot) => slot.roomId));
  const visibleTeacherIds = new Set(slotsRaw.map((slot) => slot.teacherId));
  const rooms: ScheduleResource[] = roomsRaw
    .filter((room) => isManagement || visibleRoomIds.has(room.id))
    .map((room) => ({
    id: room.id,
    name: room.name,
    locationId: room.locationId,
    locationName:
      locationsRaw.find((location) => location.id === room.locationId)?.name ??
      "Lokalizacja",
    capacity: room.capacity,
    }));
  const teachers: ScheduleResource[] = teachersRaw.filter(
    (teacher) => isManagement || visibleTeacherIds.has(teacher.id),
  );
  const slots: ScheduleSlotView[] = slotsRaw.map((slot) => {
    const localStart = toZonedTime(slot.startAt, SCHOOL_TIME_ZONE);
    const localEnd = toZonedTime(slot.endAt, SCHOOL_TIME_ZONE);
    const group = groupsRaw.find((candidate) => candidate.id === slot.groupId);
    const canEditLesson =
      isManagement ||
      (session.user.role === "TEACHER" &&
        group?.teachers.some(
          (teacher) => teacher.teacherId === session.user.id,
        ) === true);
    const now = new Date();
    const canConfirmArrival = session.user.role === "STUDENT";
    const checkInWindowOpen =
      canConfirmArrival &&
      now >= subMinutes(slot.startAt, 30) &&
      now <= addMinutes(slot.endAt, 15);
    return {
      id: slot.id,
      groupId: slot.groupId,
      groupName: slot.group.name,
      locationId: slot.group.locationId,
      locationName: slot.group.location.name,
      roomId: slot.roomId,
      roomName: slot.room.name,
      teacherId: slot.teacherId,
      teacherName: slot.teacher.name,
      studentIds: isManagement
        ? slot.group.enrollments.map((enrollment) => enrollment.studentId)
        : [],
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
      dateKey: format(localStart, "yyyy-MM-dd"),
      startTime: format(localStart, "HH:mm"),
      endTime: format(localEnd, "HH:mm"),
      durationMinutes: differenceInMinutes(slot.endAt, slot.startAt),
      status: slot.status,
      topic: slot.topic,
      version: slot.version,
      isLocked: slot.isLocked,
      cancellationReason: slot.cancellation?.reason ?? null,
      cancelledAt: slot.cancellation?.cancelledAt.toISOString() ?? null,
      canRequestChange:
        session.user.role === "TEACHER" &&
        slot.status !== "CANCELLED" &&
        slot.teacherId === session.user.id,
      canReviewChange: isManagement,
      pendingChangeRequest: slot.changeRequests[0]
        ? {
            id: slot.changeRequests[0].id,
            kind: slot.changeRequests[0].kind,
            reason: slot.changeRequests[0].reason,
            requestedByName: slot.changeRequests[0].requestedBy.name,
            createdAt: slot.changeRequests[0].createdAt.toISOString(),
          }
        : null,
      canEditLesson,
      canConfirmArrival,
      checkInWindowOpen,
      students: (studentsByGroup.get(slot.groupId) ?? []).map((enrollment) => ({
            id: enrollment.studentId,
            name: enrollment.student.name,
            attendanceStatus:
              attendanceBySlotAndStudent.get(
                `${slot.id}:${enrollment.studentId}`,
              ) ?? null,
            selfCheckedInAt:
              checkInBySlotAndStudent.get(
                `${slot.id}:${enrollment.studentId}`,
              ) ?? null,
          })),
    };
  });
  const days = Array.from({ length: 6 }, (_, index) => {
    const date = addDays(weekStart, index);
    const todayKey = format(toZonedTime(new Date(), SCHOOL_TIME_ZONE), "yyyy-MM-dd");
    return {
      key: format(date, "yyyy-MM-dd"),
      label: format(date, "EEEE", { locale: pl }),
      shortLabel: format(date, "EEEEEE", { locale: pl }),
      dayNumber: format(date, "d"),
      isToday: format(date, "yyyy-MM-dd") === todayKey,
    };
  });
  const requirements: ScheduleRequirementView[] = groupsRaw.map((group) => ({
    groupId: group.id,
    groupName: group.name,
    locationId: group.locationId,
    locationName:
      locationsRaw.find((location) => location.id === group.locationId)?.name ??
      "Lokalizacja",
    studentCount: group.enrollments.length,
    teacherId: resolveRequirementTeacherId(
      group.schedulingRequirement?.teacherId ?? null,
      group.teachers,
    ),
    preferredRoomId:
      group.schedulingRequirement?.preferredRoomId ?? null,
    lessonsPerWeek: group.schedulingRequirement?.lessonsPerWeek ?? 2,
    durationMinutes: group.schedulingRequirement?.durationMinutes ?? 60,
    allowedWeekdays:
      group.schedulingRequirement?.allowedWeekdays ?? [1, 2, 3, 4, 5],
    preferredWeekdays:
      group.schedulingRequirement?.preferredWeekdays ?? [],
    earliestStartMinute:
      group.schedulingRequirement?.earliestStartMinute ?? 15 * 60,
    latestEndMinute:
      group.schedulingRequirement?.latestEndMinute ?? 19 * 60,
    preferredStartMinute:
      group.schedulingRequirement?.preferredStartMinute ?? null,
    configured: Boolean(group.schedulingRequirement),
  }));
  const availability: TeacherAvailabilityView[] = teachersRaw.map((teacher) => {
    const windows = availabilityRaw.filter(
      (window) => window.teacherId === teacher.id,
    );
    return {
      teacherId: teacher.id,
      teacherName: teacher.name,
      windows: windows.map((window) => ({
        weekday: window.weekday,
        startMinute: window.startMinute,
        endMinute: window.endMinute,
        locationId: window.locationId ?? "",
        locationName:
          locationsRaw.find((location) => location.id === window.locationId)?.name ??
          "Bez lokalizacji",
      })),
      configured: windows.length > 0,
    };
  });

  let generation: ScheduleGenerationView | null = null;
  if (isManagement && params.propozycja) {
    const raw = await db.scheduleGeneration.findFirst({
      where: {
        id: params.propozycja,
        schoolId: session.user.schoolId,
      },
      include: {
        proposals: {
          include: {
            group: { select: { name: true } },
            room: { select: { name: true } },
            teacher: { select: { name: true } },
          },
          orderBy: { startAt: "asc" },
        },
      },
    });
    if (raw) {
      const summary = raw.summary as {
        hardViolations?: string[];
        suggestions?: string[];
        existingSlots?: number;
        scopeLabel?: string;
        rangeStart?: string;
        rangeEnd?: string;
      };
      const generationRangeStart = summary.rangeStart ?? weekStartKey;
      const generationRangeEnd =
        summary.rangeEnd ??
        format(addDays(new Date(`${weekStartKey}T12:00:00.000Z`), 5), "yyyy-MM-dd");
      generation = {
        id: raw.id,
        status: raw.status,
        score: raw.score,
        scopeLabel: summary.scopeLabel ?? "Cała szkoła",
        rangeLabel: `${format(
          new Date(`${generationRangeStart}T12:00:00.000Z`),
          "d MMM yyyy",
          { locale: pl },
        )} – ${format(
          new Date(`${generationRangeEnd}T12:00:00.000Z`),
          "d MMM yyyy",
          { locale: pl },
        )}`,
        hardViolations: summary.hardViolations ?? [],
        suggestions: summary.suggestions ?? [],
        existingSlots: summary.existingSlots ?? 0,
        proposals: raw.proposals.map((proposal) => ({
          id: proposal.id,
          groupName: proposal.group.name,
          roomName: proposal.room.name,
          teacherName: proposal.teacher.name,
          dateLabel: format(
            toZonedTime(proposal.startAt, SCHOOL_TIME_ZONE),
            "EEEE, d MMMM",
            { locale: pl },
          ),
          timeLabel: `${format(
            toZonedTime(proposal.startAt, SCHOOL_TIME_ZONE),
            "HH:mm",
          )}–${format(
            toZonedTime(proposal.endAt, SCHOOL_TIME_ZONE),
            "HH:mm",
          )}`,
          explanation: proposal.explanation,
        })),
      };
    }
  }

  const heading = roleHeading(session.user.role);
  const weekLabel = `${format(weekStart, "d MMM", { locale: pl })} – ${format(
    addDays(weekStart, 5),
    "d MMM yyyy",
    { locale: pl },
  )}`;
  const ownAvailability = availability.find(
    (entry) => entry.teacherId === session.user.id,
  );

  return (
    <AuthenticatedPanelShell session={session} active="schedule">
      <header className="schedule-page-heading">
        <div>
          <span className="section-kicker">{heading.kicker}</span>
          <h1>{heading.title}</h1>
          <p>{heading.copy}</p>
        </div>
        <span className="schedule-safe-chip">
          <LockKeyhole aria-hidden="true" />
          {isManagement ? "Publikujesz dopiero po podglądzie" : "Plan tylko do odczytu"}
        </span>
      </header>

      {isManagement ? (
        <nav className="schedule-mode-switch" aria-label="Sposób układania grafiku">
          <Link
            className={mode === "assistant" ? "active" : ""}
            href={`/panel/plan?tydzien=${weekStartKey}&tryb=auto`}
          >
            <Sparkles aria-hidden="true" />
            <span>
              <strong>Ułóż automatycznie</strong>
              <small>System przygotuje bezpieczny szkic</small>
            </span>
          </Link>
          <Link
            className={mode === "manual" ? "active" : ""}
            href={`/panel/plan?tydzien=${weekStartKey}`}
          >
            <CalendarRange aria-hidden="true" />
            <span>
              <strong>Ułóż ręcznie</strong>
              <small>Dodawaj i przesuwaj lekcje samodzielnie</small>
            </span>
          </Link>
        </nav>
      ) : (
        <div className="schedule-view-note">
          <CalendarCheck2 aria-hidden="true" />
          {session.user.role === "TEACHER"
            ? "Plan publikuje dyrektor. Niżej możesz podać własną dostępność."
            : "Zmiany wprowadza szkoła. Twój plan aktualizuje się automatycznie."}
        </div>
      )}

      {session.user.role === "TEACHER" ? (
        <section className="teacher-availability-card" aria-labelledby="teacher-availability-title">
          <div>
            <span className="section-kicker">Preferencje do grafiku</span>
            <h2 id="teacher-availability-title">Kiedy możesz prowadzić zajęcia?</h2>
            <p>Podaj swoje dni i godziny. To nie zmienia opublikowanego planu — pomaga dyrektorowi układać kolejne tygodnie.</p>
          </div>
          {ownAvailability ? (
            <AvailabilityForm entry={ownAvailability} locations={locations} />
          ) : null}
        </section>
      ) : null}

      {mode === "assistant" && isManagement ? (
        <ScheduleAssistantPanel
          weekStart={weekStartKey}
          weekLabel={weekLabel}
          groups={groups}
          locations={locations}
          rooms={rooms}
          teachers={teachers}
          requirements={requirements}
          availability={availability}
          generation={generation}
          errorCode={params.blad}
          successCode={params.sukces}
        />
      ) : (
        <ScheduleWorkspace
          canManage={isManagement}
          days={days}
          groups={groups}
          locations={locations}
          rooms={rooms}
          teachers={teachers}
          availability={availability}
          slots={slots}
          previousWeek={format(addWeeks(weekStart, -1), "yyyy-MM-dd")}
          nextWeek={format(addWeeks(weekStart, 1), "yyyy-MM-dd")}
          weekLabel={weekLabel}
        />
      )}
    </AuthenticatedPanelShell>
  );
}
