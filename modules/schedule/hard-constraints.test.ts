import { describe, expect, it, vi } from "vitest";

import {
  assertScheduleSlotCanBeSaved,
  ScheduleConstraintError,
} from "./hard-constraints";

const candidate = {
  schoolId: "school-a",
  groupId: "group-a",
  roomId: "room-a",
  teacherId: "teacher-a",
  startAt: new Date("2026-07-27T13:00:00.000Z"),
  endAt: new Date("2026-07-27T14:00:00.000Z"),
};

const activeLocation = {
  schoolId: "school-a",
  isActive: true,
  archivedAt: null,
};

function constraintClient(options?: {
  group?: object | null;
  room?: object | null;
  teacher?: object | null;
  availability?: object[];
  resourceConflict?: object | null;
  studentIds?: string[];
  studentConflict?: object | null;
}) {
  const scheduleSlotFindFirst = vi
    .fn()
    .mockResolvedValueOnce(options?.resourceConflict ?? null)
    .mockResolvedValueOnce(options?.studentConflict ?? null);
  const client = {
    courseGroup: {
      findFirst: vi.fn().mockResolvedValue(
        options?.group === undefined
          ? {
              id: "group-a",
              name: "Oxford",
              locationId: "location-a",
              location: activeLocation,
              enrollments: [
                { studentId: "student-a" },
                { studentId: "student-b" },
              ],
            }
          : options.group,
      ),
    },
    room: {
      findFirst: vi.fn().mockResolvedValue(
        options?.room === undefined
          ? {
              id: "room-a",
              name: "Sala 1",
              capacity: 8,
              locationId: "location-a",
              location: activeLocation,
            }
          : options.room,
      ),
    },
    user: {
      findFirst: vi.fn().mockResolvedValue(
        options?.teacher === undefined
          ? { id: "teacher-a", name: "Anna English" }
          : options.teacher,
      ),
    },
    availabilityWindow: {
      findMany: vi.fn().mockResolvedValue(options?.availability ?? []),
    },
    scheduleSlot: {
      findFirst: scheduleSlotFindFirst,
    },
    enrollment: {
      findMany: vi.fn().mockResolvedValue(
        (options?.studentIds ?? []).map((studentId) => ({ studentId })),
      ),
    },
  };

  return {
    client: client as unknown as Parameters<
      typeof assertScheduleSlotCanBeSaved
    >[0],
    mocks: {
      courseGroupFindFirst: client.courseGroup.findFirst,
      roomFindFirst: client.room.findFirst,
      teacherFindFirst: client.user.findFirst,
      scheduleSlotFindFirst,
    },
  };
}

async function expectConstraint(
  promise: Promise<void>,
  code: ScheduleConstraintError["code"],
) {
  await expect(promise).rejects.toMatchObject({
    name: "ScheduleConstraintError",
    code,
  });
}

describe("server schedule hard constraints", () => {
  it("accepts active resources when the teacher has no configured availability", async () => {
    const { client, mocks } = constraintClient();

    await expect(
      assertScheduleSlotCanBeSaved(client, candidate),
    ).resolves.toBeUndefined();
    expect(mocks.teacherFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "teacher-a",
          schoolId: "school-a",
          role: "TEACHER",
          status: "ACTIVE",
          archivedAt: null,
        }),
      }),
    );
  });

  it("rejects an inactive or foreign resource before saving", async () => {
    const { client } = constraintClient({ teacher: null });

    await expectConstraint(
      assertScheduleSlotCanBeSaved(client, candidate),
      "RESOURCE_UNAVAILABLE",
    );
  });

  it("rejects a room from another location", async () => {
    const { client } = constraintClient({
      room: {
        id: "room-a",
        name: "Sala 1",
        capacity: 8,
        locationId: "location-b",
        location: activeLocation,
      },
    });

    await expectConstraint(
      assertScheduleSlotCanBeSaved(client, candidate),
      "LOCATION_MISMATCH",
    );
  });

  it("counts active enrollments and rejects a room that is too small", async () => {
    const { client, mocks } = constraintClient({
      room: {
        id: "room-a",
        name: "Mała sala",
        capacity: 1,
        locationId: "location-a",
        location: activeLocation,
      },
    });

    await expectConstraint(
      assertScheduleSlotCanBeSaved(client, candidate),
      "ROOM_CAPACITY",
    );
    expect(mocks.courseGroupFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          enrollments: {
            where: { status: "ACTIVE" },
            select: { studentId: true },
          },
        }),
      }),
    );
  });

  it("requires a lesson to fit a configured teacher window", async () => {
    const { client } = constraintClient({
      availability: [
        {
          weekday: 1,
          startMinute: 16 * 60,
          endMinute: 18 * 60,
          isAvailable: true,
        },
      ],
    });

    await expectConstraint(
      assertScheduleSlotCanBeSaved(client, candidate),
      "TEACHER_UNAVAILABLE",
    );
  });

  it("accepts a lesson fully contained in a configured teacher window", async () => {
    const { client } = constraintClient({
      availability: [
        {
          weekday: 1,
          startMinute: 14 * 60,
          endMinute: 17 * 60,
          isAvailable: true,
        },
      ],
    });

    await expect(
      assertScheduleSlotCanBeSaved(client, candidate),
    ).resolves.toBeUndefined();
  });

  it("treats a configured weekday list as closed outside selected days", async () => {
    const { client } = constraintClient({
      availability: [
        {
          weekday: 3,
          startMinute: 13 * 60,
          endMinute: 19 * 60,
          isAvailable: true,
        },
      ],
    });

    await expectConstraint(
      assertScheduleSlotCanBeSaved(client, candidate),
      "TEACHER_UNAVAILABLE",
    );
  });

  it("detects resource and shared-student conflicts after hard constraints", async () => {
    const conflict = {
      groupId: "group-b",
      roomId: "room-a",
      teacherId: "teacher-b",
      group: { name: "Toronto" },
      room: { name: "Sala 1" },
      teacher: { name: "Barbara English" },
    };
    const resourceClient = constraintClient({ resourceConflict: conflict });

    await expectConstraint(
      assertScheduleSlotCanBeSaved(resourceClient.client, candidate),
      "SCHEDULE_CONFLICT",
    );

    const studentClient = constraintClient({
      studentIds: ["student-a"],
      studentConflict: {
        ...conflict,
        roomId: "room-b",
      },
    });
    await expectConstraint(
      assertScheduleSlotCanBeSaved(studentClient.client, candidate),
      "SCHEDULE_CONFLICT",
    );
  });
});
