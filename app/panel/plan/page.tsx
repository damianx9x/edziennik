import { addDays, addWeeks, differenceInMinutes, format } from "date-fns";
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
import { ScheduleAssistantPanel } from "@/modules/schedule/components/schedule-assistant-panel";
import { ScheduleWorkspace } from "@/modules/schedule/components/schedule-workspace";
import {
  getWeekStartDate,
  getWeekStartKey,
  SCHOOL_TIME_ZONE,
} from "@/modules/schedule/schema";
import type {
  ScheduleGenerationView,
  ScheduleRequirementView,
  ScheduleResource,
  ScheduleSlotView,
  TeacherAvailabilityView,
} from "@/modules/schedule/types";

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
  const mode = isManagement && params.tryb !== "reczny" ? "assistant" : "manual";

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
        select: { teacherId: true, isPrimary: true },
      },
      schedulingRequirement: true,
    },
    orderBy: { name: "asc" },
  });
  const groupIds = groupsRaw.map((group) => group.id);

  const [slotsRaw, roomsRaw, teachersRaw, availabilityRaw] = await Promise.all([
    db.scheduleSlot.findMany({
      where: {
        schoolId: session.user.schoolId,
        groupId: { in: groupIds },
        archivedAt: null,
        status: { not: "CANCELLED" },
        startAt: { lt: weekEndAt },
        endAt: { gt: weekStartAt },
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
        room: { select: { name: true } },
        teacher: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    db.room.findMany({
      where: {
        schoolId: session.user.schoolId,
        isActive: true,
        archivedAt: null,
      },
      select: { id: true, name: true, capacity: true },
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
    isManagement
      ? db.availabilityWindow.findMany({
          where: {
            schoolId: session.user.schoolId,
            teacherId: { not: null },
            isAvailable: true,
          },
          select: {
            teacherId: true,
            weekday: true,
            startMinute: true,
            endMinute: true,
          },
          orderBy: [{ teacherId: "asc" }, { weekday: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const groups: ScheduleResource[] = groupsRaw.map((group) => ({
    id: group.id,
    name: group.name,
    studentIds: group.enrollments.map((enrollment) => enrollment.studentId),
    teacherIds: group.teachers.map((teacher) => teacher.teacherId),
  }));
  const visibleRoomIds = new Set(slotsRaw.map((slot) => slot.roomId));
  const visibleTeacherIds = new Set(slotsRaw.map((slot) => slot.teacherId));
  const rooms: ScheduleResource[] = roomsRaw
    .filter((room) => isManagement || visibleRoomIds.has(room.id))
    .map((room) => ({
    id: room.id,
    name: room.name,
    capacity: room.capacity,
    }));
  const teachers: ScheduleResource[] = teachersRaw.filter(
    (teacher) => isManagement || visibleTeacherIds.has(teacher.id),
  );
  const slots: ScheduleSlotView[] = slotsRaw.map((slot) => {
    const localStart = toZonedTime(slot.startAt, SCHOOL_TIME_ZONE);
    const localEnd = toZonedTime(slot.endAt, SCHOOL_TIME_ZONE);
    return {
      id: slot.id,
      groupId: slot.groupId,
      groupName: slot.group.name,
      roomId: slot.roomId,
      roomName: slot.room.name,
      teacherId: slot.teacherId,
      teacherName: slot.teacher.name,
      studentIds: slot.group.enrollments.map(
        (enrollment) => enrollment.studentId,
      ),
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
    studentCount: group.enrollments.length,
    teacherId: group.schedulingRequirement?.teacherId ?? null,
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
      weekdays: windows.map((window) => window.weekday),
      startMinute: windows[0]?.startMinute ?? 15 * 60,
      endMinute: windows[0]?.endMinute ?? 19 * 60,
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
      };
      generation = {
        id: raw.id,
        status: raw.status,
        score: raw.score,
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
            href={`/panel/plan?tydzien=${weekStartKey}`}
          >
            <Sparkles aria-hidden="true" />
            <span>
              <strong>Ułóż automatycznie</strong>
              <small>System przygotuje bezpieczny szkic</small>
            </span>
          </Link>
          <Link
            className={mode === "manual" ? "active" : ""}
            href={`/panel/plan?tydzien=${weekStartKey}&tryb=reczny`}
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
          Zmiany wprowadza szkoła. Twój plan aktualizuje się automatycznie.
        </div>
      )}

      {mode === "assistant" && isManagement ? (
        <ScheduleAssistantPanel
          weekStart={weekStartKey}
          weekLabel={weekLabel}
          groups={groups}
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
          rooms={rooms}
          teachers={teachers}
          slots={slots}
          previousWeek={format(addWeeks(weekStart, -1), "yyyy-MM-dd")}
          nextWeek={format(addWeeks(weekStart, 1), "yyyy-MM-dd")}
          weekLabel={weekLabel}
        />
      )}
    </AuthenticatedPanelShell>
  );
}
