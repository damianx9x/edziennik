import type { Prisma } from "@/app/generated/prisma/client";

import type { RelationshipKind } from "./relationship-schema";

type RelationshipClient = Pick<
  Prisma.TransactionClient,
  | "studentAvailabilityWindow"
  | "courseGroup"
  | "enrollment"
  | "groupTeacher"
  | "parentChild"
  | "room"
  | "schedulingRequirement"
  | "user"
>;

export type StudentAvailabilityWindow = {
  weekday: number;
  startMinute: number;
  endMinute: number;
};

async function ensurePrimaryTeacher(
  client: RelationshipClient,
  groupId: string,
) {
  const primary = await client.groupTeacher.findFirst({
    where: { groupId, archivedAt: null, isPrimary: true },
    select: { teacherId: true },
  });
  if (primary) return;
  const first = await client.groupTeacher.findFirst({
    where: { groupId, archivedAt: null },
    orderBy: { assignedAt: "asc" },
    select: { teacherId: true },
  });
  if (first) {
    await client.groupTeacher.update({
      where: { groupId_teacherId: { groupId, teacherId: first.teacherId } },
      data: { isPrimary: true },
    });
  }
}

function uniqueIds(ids: readonly string[]) {
  return [...new Set(ids)];
}

async function assertUsers(
  client: RelationshipClient,
  schoolId: string,
  ids: readonly string[],
  role: "PARENT" | "STUDENT" | "TEACHER",
) {
  if (ids.length === 0) return;
  const count = await client.user.count({
    where: {
      id: { in: uniqueIds(ids) },
      schoolId,
      role,
      archivedAt: null,
      status: { not: "ARCHIVED" },
    },
  });
  if (count !== uniqueIds(ids).length) {
    throw new Error("Wybrana osoba nie jest już aktywna w tej szkole.");
  }
}

async function assertGroups(
  client: RelationshipClient,
  schoolId: string,
  ids: readonly string[],
) {
  if (ids.length === 0) return;
  const count = await client.courseGroup.count({
    where: {
      id: { in: uniqueIds(ids) },
      schoolId,
      isActive: true,
      archivedAt: null,
    },
  });
  if (count !== uniqueIds(ids).length) {
    throw new Error("Wybrana grupa nie jest już aktywna w tej szkole.");
  }
}

export async function getRelationshipIds(
  client: RelationshipClient,
  schoolId: string,
  relationKind: RelationshipKind,
  entityId: string,
): Promise<string[]> {
  if (relationKind === "PARENT_CHILDREN") {
    await assertUsers(client, schoolId, [entityId], "PARENT");
    return (await client.parentChild.findMany({
      where: { schoolId, parentId: entityId, archivedAt: null },
      select: { childId: true },
    })).map((item) => item.childId);
  }
  if (relationKind === "STUDENT_PARENTS") {
    await assertUsers(client, schoolId, [entityId], "STUDENT");
    return (await client.parentChild.findMany({
      where: { schoolId, childId: entityId, archivedAt: null },
      select: { parentId: true },
    })).map((item) => item.parentId);
  }
  if (relationKind === "STUDENT_GROUPS") {
    await assertUsers(client, schoolId, [entityId], "STUDENT");
    return (await client.enrollment.findMany({
      where: { studentId: entityId, status: "ACTIVE", group: { schoolId } },
      select: { groupId: true },
    })).map((item) => item.groupId);
  }
  if (relationKind === "TEACHER_GROUPS") {
    await assertUsers(client, schoolId, [entityId], "TEACHER");
    return (await client.groupTeacher.findMany({
      where: { teacherId: entityId, archivedAt: null, group: { schoolId } },
      select: { groupId: true },
    })).map((item) => item.groupId);
  }
  if (relationKind === "GROUP_STUDENTS") {
    await assertGroups(client, schoolId, [entityId]);
    return (await client.enrollment.findMany({
      where: { groupId: entityId, status: "ACTIVE" },
      select: { studentId: true },
    })).map((item) => item.studentId);
  }
  if (relationKind === "GROUP_TEACHERS") {
    await assertGroups(client, schoolId, [entityId]);
    return (await client.groupTeacher.findMany({
      where: { groupId: entityId, archivedAt: null },
      select: { teacherId: true },
    })).map((item) => item.teacherId);
  }
  if (relationKind === "ROOM_PREFERRED_GROUPS") {
    const room = await client.room.findFirst({
      where: { id: entityId, schoolId, archivedAt: null, isActive: true },
      select: { id: true },
    });
    if (!room) throw new Error("Ta sala nie jest już aktywna.");
    return (await client.schedulingRequirement.findMany({
      where: { schoolId, preferredRoomId: entityId, isActive: true },
      select: { groupId: true },
    })).map((item) => item.groupId);
  }

  await assertGroups(client, schoolId, [entityId]);
  const requirement = await client.schedulingRequirement.findFirst({
    where: { schoolId, groupId: entityId, isActive: true },
    select: { preferredRoomId: true },
  });
  return requirement?.preferredRoomId ? [requirement.preferredRoomId] : [];
}

async function assertRoomMatchesGroups(
  client: RelationshipClient,
  schoolId: string,
  roomId: string,
  groupIds: readonly string[],
) {
  const room = await client.room.findFirst({
    where: { id: roomId, schoolId, archivedAt: null, isActive: true },
    select: { locationId: true },
  });
  if (!room) throw new Error("Ta sala nie jest już aktywna.");
  if (groupIds.length === 0) return;
  const matching = await client.courseGroup.count({
    where: {
      id: { in: uniqueIds(groupIds) },
      schoolId,
      locationId: room.locationId,
      archivedAt: null,
      isActive: true,
    },
  });
  if (matching !== uniqueIds(groupIds).length) {
    throw new Error("Grupa i preferowana sala muszą należeć do tej samej lokalizacji.");
  }
}

export async function applyRelationshipDelta(
  client: RelationshipClient,
  input: {
    schoolId: string;
    relationKind: RelationshipKind;
    entityId: string;
    addIds: readonly string[];
    removeIds: readonly string[];
  },
) {
  const addIds = uniqueIds(input.addIds).filter((id) => !input.removeIds.includes(id));
  const removeIds = uniqueIds(input.removeIds);
  const { schoolId, entityId, relationKind } = input;

  if (relationKind === "PARENT_CHILDREN" || relationKind === "STUDENT_PARENTS") {
    const parentId = relationKind === "PARENT_CHILDREN" ? entityId : null;
    const childId = relationKind === "STUDENT_PARENTS" ? entityId : null;
    if (parentId) {
      await assertUsers(client, schoolId, [parentId], "PARENT");
      await assertUsers(client, schoolId, [...addIds, ...removeIds], "STUDENT");
      await client.parentChild.updateMany({
        where: { schoolId, parentId, childId: { in: removeIds }, archivedAt: null },
        data: { archivedAt: new Date() },
      });
      for (const id of addIds) {
        await client.parentChild.upsert({
          where: { parentId_childId: { parentId, childId: id } },
          update: { schoolId, archivedAt: null },
          create: { schoolId, parentId, childId: id },
        });
      }
    } else {
      await assertUsers(client, schoolId, [childId!], "STUDENT");
      await assertUsers(client, schoolId, [...addIds, ...removeIds], "PARENT");
      await client.parentChild.updateMany({
        where: { schoolId, childId: childId!, parentId: { in: removeIds }, archivedAt: null },
        data: { archivedAt: new Date() },
      });
      for (const id of addIds) {
        await client.parentChild.upsert({
          where: { parentId_childId: { parentId: id, childId: childId! } },
          update: { schoolId, archivedAt: null },
          create: { schoolId, parentId: id, childId: childId! },
        });
      }
    }
    return;
  }

  if (relationKind === "STUDENT_GROUPS" || relationKind === "GROUP_STUDENTS") {
    const studentId = relationKind === "STUDENT_GROUPS" ? entityId : null;
    const groupId = relationKind === "GROUP_STUDENTS" ? entityId : null;
    if (studentId) {
      await assertUsers(client, schoolId, [studentId], "STUDENT");
      await assertGroups(client, schoolId, [...addIds, ...removeIds]);
      await client.enrollment.updateMany({
        where: { studentId, groupId: { in: removeIds }, status: "ACTIVE" },
        data: { status: "CANCELLED", endedAt: new Date() },
      });
      for (const id of addIds) {
        await client.enrollment.upsert({
          where: { groupId_studentId: { groupId: id, studentId } },
          update: { status: "ACTIVE", endedAt: null },
          create: { groupId: id, studentId },
        });
      }
    } else {
      await assertGroups(client, schoolId, [groupId!]);
      await assertUsers(client, schoolId, [...addIds, ...removeIds], "STUDENT");
      await client.enrollment.updateMany({
        where: { groupId: groupId!, studentId: { in: removeIds }, status: "ACTIVE" },
        data: { status: "CANCELLED", endedAt: new Date() },
      });
      for (const id of addIds) {
        await client.enrollment.upsert({
          where: { groupId_studentId: { groupId: groupId!, studentId: id } },
          update: { status: "ACTIVE", endedAt: null },
          create: { groupId: groupId!, studentId: id },
        });
      }
    }
    return;
  }

  if (relationKind === "TEACHER_GROUPS" || relationKind === "GROUP_TEACHERS") {
    const teacherId = relationKind === "TEACHER_GROUPS" ? entityId : null;
    const groupId = relationKind === "GROUP_TEACHERS" ? entityId : null;
    if (teacherId) {
      await assertUsers(client, schoolId, [teacherId], "TEACHER");
      await assertGroups(client, schoolId, [...addIds, ...removeIds]);
      await client.groupTeacher.updateMany({
        where: { teacherId, groupId: { in: removeIds }, archivedAt: null },
        data: { archivedAt: new Date(), isPrimary: false },
      });
      for (const id of addIds) {
        await client.groupTeacher.upsert({
          where: { groupId_teacherId: { groupId: id, teacherId } },
          update: { archivedAt: null },
          create: { groupId: id, teacherId },
        });
      }
      for (const id of removeIds) await ensurePrimaryTeacher(client, id);
    } else {
      await assertGroups(client, schoolId, [groupId!]);
      await assertUsers(client, schoolId, [...addIds, ...removeIds], "TEACHER");
      await client.groupTeacher.updateMany({
        where: { groupId: groupId!, teacherId: { in: removeIds }, archivedAt: null },
        data: { archivedAt: new Date(), isPrimary: false },
      });
      for (const id of addIds) {
        await client.groupTeacher.upsert({
          where: { groupId_teacherId: { groupId: groupId!, teacherId: id } },
          update: { archivedAt: null },
          create: { groupId: groupId!, teacherId: id },
        });
      }
      await ensurePrimaryTeacher(client, groupId!);
    }
    return;
  }

  if (relationKind === "ROOM_PREFERRED_GROUPS") {
    await assertRoomMatchesGroups(client, schoolId, entityId, addIds);
    await assertGroups(client, schoolId, removeIds);
    await client.schedulingRequirement.updateMany({
      where: { schoolId, groupId: { in: removeIds }, preferredRoomId: entityId },
      data: { preferredRoomId: null },
    });
    for (const groupId of addIds) {
      await client.schedulingRequirement.upsert({
        where: { groupId },
        update: { schoolId, preferredRoomId: entityId, isActive: true },
        create: { schoolId, groupId, preferredRoomId: entityId },
      });
    }
    return;
  }

  await assertGroups(client, schoolId, [entityId]);
  if (addIds.length > 1) throw new Error("Grupa może mieć jedną preferowaną salę.");
  if (addIds[0]) await assertRoomMatchesGroups(client, schoolId, addIds[0], [entityId]);
  const nextRoomId = addIds[0] ?? null;
  await client.schedulingRequirement.upsert({
    where: { groupId: entityId },
    update: { schoolId, preferredRoomId: nextRoomId, isActive: true },
    create: { schoolId, groupId: entityId, preferredRoomId: nextRoomId },
  });
}

export async function applyStudentAvailability(
  client: RelationshipClient,
  input: {
    schoolId: string;
    studentId: string;
    windows: readonly StudentAvailabilityWindow[];
  },
) {
  await assertUsers(client, input.schoolId, [input.studentId], "STUDENT");
  await client.studentAvailabilityWindow.deleteMany({
    where: { schoolId: input.schoolId, studentId: input.studentId },
  });
  if (input.windows.length > 0) {
    await client.studentAvailabilityWindow.createMany({
      data: input.windows.map((window) => ({
        schoolId: input.schoolId,
        studentId: input.studentId,
        weekday: window.weekday,
        startMinute: window.startMinute,
        endMinute: window.endMinute,
        preference: 10,
        note: "Preferencja ucznia z kartoteki",
      })),
    });
  }
}
