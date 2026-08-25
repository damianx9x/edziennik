import { addDays, addMinutes, differenceInMinutes, format } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

import { evaluateConfiguredAvailability } from "./hard-constraints";
import { GRID_STEP_MINUTES, SCHOOL_TIME_ZONE } from "./schema";

export type SolverResource = {
  id: string;
  name: string;
};

export type SolverRoom = SolverResource & {
  capacity: number | null;
  locationId: string;
};

export type SolverRequirement = {
  id: string;
  groupId: string;
  groupName: string;
  locationId: string;
  studentIds: string[];
  teacherId: string | null;
  preferredRoomId: string | null;
  lessonsPerWeek: number;
  durationMinutes: number;
  allowedWeekdays: number[];
  preferredWeekdays: number[];
  earliestStartMinute: number;
  latestEndMinute: number;
  preferredStartMinute: number | null;
};

export type SolverAvailability = {
  teacherId: string | null;
  studentId?: string | null;
  roomId: string | null;
  groupId: string | null;
  weekday: number;
  startMinute: number;
  endMinute: number;
  isAvailable: boolean;
  preference: number;
  locationId?: string | null;
};

export type SolverFixedSlot = {
  id: string;
  groupId: string;
  roomId: string;
  teacherId: string;
  startAt: Date;
  endAt: Date;
  studentIds: string[];
  locationId: string;
};

export type SolverProposal = {
  taskId: string;
  groupId: string;
  groupName: string;
  roomId: string;
  roomName: string;
  teacherId: string;
  teacherName: string;
  startAt: Date;
  endAt: Date;
  score: number;
  explanation: string;
  studentIds: string[];
  locationId: string;
};

export type SolverResult = {
  proposals: SolverProposal[];
  score: number;
  hardViolations: string[];
  suggestions: string[];
  exploredNodes: number;
};

export interface ScheduleSolver {
  solve(input: {
    weekStart: string;
    rangeStart?: string;
    rangeEnd?: string;
    requirements: SolverRequirement[];
    rooms: SolverRoom[];
    teachers: SolverResource[];
    availability: SolverAvailability[];
    fixedSlots: SolverFixedSlot[];
    timeZone?: string;
    maxNodes?: number;
    travelRules?: Array<{ fromLocationId: string; toLocationId: string; minutes: number }>;
    onlineLocationIds?: string[];
  }): SolverResult;
}

type Candidate = SolverProposal & {
  weekday: number;
  startMinute: number;
};

function overlaps(
  first: { startAt: Date; endAt: Date },
  second: { startAt: Date; endAt: Date },
) {
  return first.startAt < second.endAt && first.endAt > second.startAt;
}

function sharesStudent(first: string[], second: string[]) {
  const ids = new Set(first);
  return second.some((id) => ids.has(id));
}

function conflictsWith(
  candidate: Candidate,
  other: SolverProposal | SolverFixedSlot,
  travelRules: Array<{ fromLocationId: string; toLocationId: string; minutes: number }>,
  onlineLocationIds: Set<string>,
) {
  if (
    candidate.groupId === other.groupId &&
    format(candidate.startAt, "yyyy-MM-dd") ===
      format(other.startAt, "yyyy-MM-dd")
  ) {
    return true;
  }
  if (!overlaps(candidate, other)) {
    if (
      candidate.teacherId === other.teacherId &&
      candidate.locationId !== other.locationId &&
      !onlineLocationIds.has(candidate.locationId) &&
      !onlineLocationIds.has(other.locationId)
    ) {
      const candidateFirst = candidate.endAt <= other.startAt;
      const fromLocationId = candidateFirst ? candidate.locationId : other.locationId;
      const toLocationId = candidateFirst ? other.locationId : candidate.locationId;
      const gap = candidateFirst
        ? differenceInMinutes(other.startAt, candidate.endAt)
        : differenceInMinutes(candidate.startAt, other.endAt);
      const required = travelRules.find((rule) => rule.fromLocationId === fromLocationId && rule.toLocationId === toLocationId)?.minutes ?? 30;
      if (gap >= 0 && gap < required) return true;
    }
    return false;
  }
  return (
    candidate.groupId === other.groupId ||
    candidate.roomId === other.roomId ||
    candidate.teacherId === other.teacherId ||
    sharesStudent(candidate.studentIds, other.studentIds)
  );
}

function fitsAvailability(
  windows: SolverAvailability[],
  resource: { teacherId?: string; studentId?: string; roomId?: string; groupId?: string; locationId?: string },
  weekday: number,
  startMinute: number,
  endMinute: number,
) {
  const relevant = windows.filter(
    (window) =>
      ((resource.teacherId && window.teacherId === resource.teacherId) ||
        (resource.studentId && window.studentId === resource.studentId) ||
        (resource.roomId && window.roomId === resource.roomId) ||
        (resource.groupId && window.groupId === resource.groupId)),
  );
  return evaluateConfiguredAvailability(relevant, {
    weekday,
    startMinute,
    endMinute,
    locationId: resource.locationId,
  });
}

function dynamicScore(candidate: Candidate, chosen: SolverProposal[]) {
  let score = candidate.score;
  for (const other of chosen) {
    if (
      candidate.teacherId === other.teacherId &&
      format(candidate.startAt, "yyyy-MM-dd") ===
        format(other.startAt, "yyyy-MM-dd")
    ) {
      const gap = Math.min(
        Math.abs(differenceInMinutes(candidate.startAt, other.endAt)),
        Math.abs(differenceInMinutes(other.startAt, candidate.endAt)),
      );
      score += gap <= 30 ? 12 : gap > 120 ? -8 : 2;
    }
  }
  return score;
}

function buildCandidates(input: {
  taskId: string;
  requirement: SolverRequirement;
  weekStart: string;
  rangeStart?: string;
  rangeEnd?: string;
  rooms: SolverRoom[];
  teachers: SolverResource[];
  availability: SolverAvailability[];
  timeZone: string;
}) {
  const {
    taskId,
    requirement,
    weekStart,
    rangeStart,
    rangeEnd,
    rooms,
    teachers,
    availability,
    timeZone,
  } = input;
  const teacher = teachers.find((item) => item.id === requirement.teacherId);
  if (!teacher) {
    return [];
  }
  const candidates: Candidate[] = [];
  const orderedRooms = rooms
    .filter((room) => room.locationId === requirement.locationId)
    .sort((first, second) => {
    if (first.id === requirement.preferredRoomId) return -1;
    if (second.id === requirement.preferredRoomId) return 1;
    return first.name.localeCompare(second.name, "pl");
    });

  for (const weekday of requirement.allowedWeekdays) {
    if (weekday < 1 || weekday > 7) continue;
    for (
      let startMinute = requirement.earliestStartMinute;
      startMinute + requirement.durationMinutes <= requirement.latestEndMinute;
      startMinute += GRID_STEP_MINUTES
    ) {
      const endMinute = startMinute + requirement.durationMinutes;
      const dayKey = format(
        addDays(new Date(`${weekStart}T12:00:00Z`), weekday - 1),
        "yyyy-MM-dd",
      );
      if (
        (rangeStart && dayKey < rangeStart) ||
        (rangeEnd && dayKey > rangeEnd)
      ) {
        continue;
      }
      const localStart = `${dayKey}T${String(
        Math.floor(startMinute / 60),
      ).padStart(2, "0")}:${String(startMinute % 60).padStart(2, "0")}:00`;
      const startAt = fromZonedTime(localStart, timeZone);
      const endAt = addMinutes(startAt, requirement.durationMinutes);
      const teacherFit = fitsAvailability(
        availability,
        { teacherId: teacher.id, locationId: requirement.locationId },
        weekday,
        startMinute,
        endMinute,
      );
      const groupFit = fitsAvailability(
        availability,
        { groupId: requirement.groupId },
        weekday,
        startMinute,
        endMinute,
      );
      const studentFits = requirement.studentIds.map((studentId) =>
        fitsAvailability(
          availability,
          { studentId },
          weekday,
          startMinute,
          endMinute,
        ),
      );
      if (
        !teacherFit.allowed ||
        !groupFit.allowed ||
        studentFits.some((fit) => !fit.allowed)
      ) continue;

      for (const room of orderedRooms) {
        if (
          room.capacity !== null &&
          room.capacity < requirement.studentIds.length
        ) {
          continue;
        }
        const roomFit = fitsAvailability(
          availability,
          { roomId: room.id },
          weekday,
          startMinute,
          endMinute,
        );
        if (!roomFit.allowed) continue;

        let score =
          teacherFit.preference +
          groupFit.preference +
          roomFit.preference +
          studentFits.reduce((total, fit) => total + fit.preference, 0);
        const reasons: string[] = ["brak kolizji zasobów"];
        if (studentFits.some((fit) => fit.preference > 0)) {
          reasons.push("preferencje uczniów");
        }
        if (requirement.preferredWeekdays.includes(weekday)) {
          score += 24;
          reasons.push("preferowany dzień");
        }
        if (room.id === requirement.preferredRoomId) {
          score += 16;
          reasons.push("preferowana sala");
        }
        if (requirement.preferredStartMinute !== null) {
          const distance = Math.abs(
            startMinute - requirement.preferredStartMinute,
          );
          score += Math.max(0, 18 - Math.floor(distance / 30) * 3);
          if (distance === 0) reasons.push("preferowana godzina");
        }

        candidates.push({
          taskId,
          groupId: requirement.groupId,
          groupName: requirement.groupName,
          roomId: room.id,
          roomName: room.name,
          teacherId: teacher.id,
          teacherName: teacher.name,
          startAt,
          endAt,
          score,
          explanation: reasons.join(" · "),
          studentIds: requirement.studentIds,
          locationId: requirement.locationId,
          weekday,
          startMinute,
        });
      }
    }
  }

  return candidates.sort(
    (first, second) =>
      second.score - first.score ||
      first.startAt.getTime() - second.startAt.getTime() ||
      first.roomName.localeCompare(second.roomName, "pl"),
  );
}

export const deterministicScheduleSolver: ScheduleSolver = {
  solve({
    weekStart,
    rangeStart,
    rangeEnd,
    requirements,
    rooms,
    teachers,
    availability,
    fixedSlots,
    timeZone = SCHOOL_TIME_ZONE,
    maxNodes = 50_000,
    travelRules = [],
    onlineLocationIds = [],
  }) {
    const tasks = requirements.flatMap((requirement) =>
      Array.from({ length: requirement.lessonsPerWeek }, (_, index) => ({
        id: `${requirement.id}:${index + 1}`,
        requirement,
      })),
    );
    const prepared = tasks
      .map((task) => ({
        ...task,
        candidates: buildCandidates({
          taskId: task.id,
          requirement: task.requirement,
          weekStart,
          rangeStart,
          rangeEnd,
          rooms,
          teachers,
          availability,
          timeZone,
        }),
      }))
      .sort(
        (first, second) =>
          first.candidates.length - second.candidates.length ||
          second.requirement.studentIds.length -
            first.requirement.studentIds.length ||
          first.requirement.groupName.localeCompare(
            second.requirement.groupName,
            "pl",
          ),
      );

    let exploredNodes = 0;
    let best: SolverProposal[] = [];
    let bestScore = Number.NEGATIVE_INFINITY;
    const onlineLocations = new Set(onlineLocationIds);

    function visit(index: number, chosen: SolverProposal[], score: number) {
      if (exploredNodes >= maxNodes) return;
      exploredNodes += 1;
      if (
        chosen.length > best.length ||
        (chosen.length === best.length && score > bestScore)
      ) {
        best = [...chosen];
        bestScore = score;
      }
      if (index >= prepared.length || best.length === prepared.length) return;

      const task = prepared[index];
      for (const candidate of task.candidates) {
        if (
          fixedSlots.some((slot) => conflictsWith(candidate, slot, travelRules, onlineLocations)) ||
          chosen.some((slot) => conflictsWith(candidate, slot, travelRules, onlineLocations))
        ) {
          continue;
        }
        const candidateScore = dynamicScore(candidate, chosen);
        visit(
          index + 1,
          [...chosen, { ...candidate, score: candidateScore }],
          score + candidateScore,
        );
        if (best.length === prepared.length || exploredNodes >= maxNodes) break;
      }

      visit(index + 1, chosen, score - 1_000);
    }

    visit(0, [], 0);
    const assignedTasks = new Set(best.map((proposal) => proposal.taskId));
    const hardViolations = prepared
      .filter((task) => !assignedTasks.has(task.id))
      .map((task) => {
        if (!task.requirement.teacherId) {
          return `${task.requirement.groupName}: przypisz wykładowcę.`;
        }
        if (task.candidates.length === 0) {
          return `${task.requirement.groupName}: brak terminu pasującego do dostępności i pojemności sal.`;
        }
        return `${task.requirement.groupName}: dostępne terminy kolidują z innymi zajęciami.`;
      });
    const suggestions = hardViolations.length
      ? [
          "Rozszerz dostępne dni lub godziny dla wskazanych grup.",
          "Sprawdź dostępność wykładowców i pojemność sal.",
          "Zablokuj poprawne lekcje i wygeneruj ponownie tylko pozostałe.",
        ]
      : [
          "Wszystkie wymagane lekcje zostały ułożone bez kolizji.",
          "Przejrzyj propozycję i zatwierdź ją dopiero, gdy pasuje szkole.",
        ];

    return {
      proposals: best.sort(
        (first, second) => first.startAt.getTime() - second.startAt.getTime(),
      ),
      score: Number.isFinite(bestScore) ? bestScore : 0,
      hardViolations,
      suggestions,
      exploredNodes,
    };
  },
};
