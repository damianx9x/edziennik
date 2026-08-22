import { describe, expect, it } from "vitest";

import {
  deterministicScheduleSolver,
  type SolverRequirement,
} from "./solver";

const rooms = [
  { id: "room-a", name: "Sala A", capacity: 8, locationId: "location-a" },
  { id: "room-b", name: "Sala B", capacity: 4, locationId: "location-a" },
  { id: "room-c", name: "Sala C", capacity: 8, locationId: "location-b" },
];
const teachers = [
  { id: "teacher-a", name: "Anna English" },
  { id: "teacher-b", name: "Barbara English" },
];
const baseRequirement: SolverRequirement = {
  id: "requirement-a",
  groupId: "group-a",
  groupName: "Oxford",
  locationId: "location-a",
  studentIds: ["student-a", "student-b"],
  teacherId: "teacher-a",
  preferredRoomId: "room-a",
  lessonsPerWeek: 2,
  durationMinutes: 60,
  allowedWeekdays: [1, 3],
  preferredWeekdays: [1, 3],
  earliestStartMinute: 15 * 60,
  latestEndMinute: 18 * 60,
  preferredStartMinute: 16 * 60,
};

describe("deterministic schedule solver", () => {
  it("generates all lessons without resource conflicts", () => {
    const result = deterministicScheduleSolver.solve({
      weekStart: "2026-07-27",
      requirements: [baseRequirement],
      rooms,
      teachers,
      availability: [],
      fixedSlots: [],
    });

    expect(result.hardViolations).toEqual([]);
    expect(result.proposals).toHaveLength(2);
    expect(result.proposals[0]?.startAt.toISOString().slice(0, 10)).not.toEqual(
      result.proposals[1]?.startAt.toISOString().slice(0, 10),
    );
  });

  it("keeps fixed lessons and avoids a shared student conflict", () => {
    const second: SolverRequirement = {
      ...baseRequirement,
      id: "requirement-b",
      groupId: "group-b",
      groupName: "Toronto",
      studentIds: ["student-b", "student-c"],
      teacherId: "teacher-b",
      preferredRoomId: "room-b",
      lessonsPerWeek: 1,
      allowedWeekdays: [1],
      preferredWeekdays: [1],
      earliestStartMinute: 15 * 60,
      latestEndMinute: 17 * 60,
      preferredStartMinute: 15 * 60,
    };
    const result = deterministicScheduleSolver.solve({
      weekStart: "2026-07-27",
      requirements: [{ ...baseRequirement, lessonsPerWeek: 1 }, second],
      rooms,
      teachers,
      availability: [],
      fixedSlots: [
        {
          id: "fixed",
          groupId: "another-group",
          roomId: "room-b",
          teacherId: "another-teacher",
          startAt: new Date("2026-07-27T13:00:00.000Z"),
          endAt: new Date("2026-07-27T14:00:00.000Z"),
          studentIds: ["student-b"],
        },
      ],
    });

    expect(result.hardViolations).toEqual([]);
    const [first, secondProposal] = result.proposals;
    expect(first.startAt < secondProposal.endAt && first.endAt > secondProposal.startAt).toBe(
      false,
    );
  });

  it("explains an impossible requirement instead of publishing a partial plan", () => {
    const result = deterministicScheduleSolver.solve({
      weekStart: "2026-07-27",
      requirements: [
        {
          ...baseRequirement,
          lessonsPerWeek: 1,
          teacherId: null,
        },
      ],
      rooms,
      teachers,
      availability: [],
      fixedSlots: [],
    });

    expect(result.proposals).toHaveLength(0);
    expect(result.hardViolations[0]).toContain("przypisz wykładowcę");
  });

  it("keeps proposals inside the selected date range", () => {
    const result = deterministicScheduleSolver.solve({
      weekStart: "2026-07-27",
      rangeStart: "2026-07-29",
      rangeEnd: "2026-07-31",
      requirements: [
        {
          ...baseRequirement,
          allowedWeekdays: [1, 3, 5],
          preferredWeekdays: [1],
          lessonsPerWeek: 2,
        },
      ],
      rooms,
      teachers,
      availability: [],
      fixedSlots: [],
    });

    expect(result.hardViolations).toEqual([]);
    expect(
      result.proposals.every((proposal) => {
        const key = proposal.startAt.toISOString().slice(0, 10);
        return key >= "2026-07-29" && key <= "2026-07-31";
      }),
    ).toBe(true);
  });

  it("never assigns a room from another location", () => {
    const result = deterministicScheduleSolver.solve({
      weekStart: "2026-07-27",
      requirements: [{ ...baseRequirement, lessonsPerWeek: 1 }],
      rooms: [
        { id: "wrong-room", name: "Inny oddział", capacity: 20, locationId: "location-b" },
        { id: "right-room", name: "Ten oddział", capacity: 8, locationId: "location-a" },
      ],
      teachers,
      availability: [],
      fixedSlots: [],
    });

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]?.roomId).toBe("right-room");
  });

  it("does not use a weekday omitted from configured teacher availability", () => {
    const result = deterministicScheduleSolver.solve({
      weekStart: "2026-07-27",
      requirements: [
        {
          ...baseRequirement,
          lessonsPerWeek: 1,
          allowedWeekdays: [1],
          preferredWeekdays: [1],
        },
      ],
      rooms,
      teachers,
      availability: [
        {
          teacherId: "teacher-a",
          roomId: null,
          groupId: null,
          weekday: 3,
          startMinute: 13 * 60,
          endMinute: 19 * 60,
          isAvailable: true,
          preference: 0,
        },
      ],
      fixedSlots: [],
    });

    expect(result.proposals).toHaveLength(0);
    expect(result.hardViolations[0]).toContain("brak terminu");
  });

  it("respects individual student availability when generating a group plan", () => {
    const result = deterministicScheduleSolver.solve({
      weekStart: "2026-07-27",
      requirements: [{ ...baseRequirement, lessonsPerWeek: 1 }],
      rooms,
      teachers,
      availability: [
        {
          teacherId: null,
          studentId: "student-a",
          roomId: null,
          groupId: null,
          weekday: 3,
          startMinute: 16 * 60,
          endMinute: 18 * 60,
          isAvailable: true,
          preference: 10,
        },
      ],
      fixedSlots: [],
    });

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]?.startAt.toISOString().slice(0, 10)).toBe(
      "2026-07-29",
    );
    expect(result.proposals[0]?.explanation).toContain("preferencje uczniów");
  });
});
