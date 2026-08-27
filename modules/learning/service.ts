import { db } from "@/lib/server/db";

import { accessibleGroupWhere, type LearningActor } from "./access";

export async function listLearningOverview(actor: LearningActor) {
  const studentIds =
    actor.role === "PARENT"
      ? (
          await db.parentChild.findMany({
            where: { schoolId: actor.schoolId, parentId: actor.id, archivedAt: null },
            select: { childId: true },
          })
        ).map((link) => link.childId)
      : actor.role === "STUDENT"
        ? [actor.id]
        : undefined;

  return db.courseGroup.findMany({
    where: accessibleGroupWhere(actor),
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      location: { select: { id: true, name: true, isOnline: true } },
      learningMaterials: {
        where: {
          archivedAt: null,
          ...(actor.role === "SYSTEM_OWNER" || actor.role === "DIRECTOR" ? {} : {
            OR: [
              { audience: "GROUP" },
              { createdById: actor.id },
              { recipients: { some: { userId: { in: actor.role === "PARENT" ? (studentIds ?? []) : [actor.id] } } } },
            ],
          }),
        },
        orderBy: { publishedAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          externalUrl: true,
          storedFileId: true,
          publishedAt: true,
          audience: true,
          recipients: { select: { userId: true, user: { select: { name: true } } } },
          createdBy: { select: { id: true, name: true } },
        },
      },
      enrollments: { where: { status: "ACTIVE" }, select: { student: { select: { id: true, name: true } } } },
      teachers: { where: { archivedAt: null }, select: { teacher: { select: { id: true, name: true } } } },
      homeworkAssignments: {
        where: { archivedAt: null },
        orderBy: [{ dueAt: "asc" }, { publishedAt: "desc" }],
        select: {
          id: true,
          title: true,
          instructions: true,
          dueAt: true,
          publishedAt: true,
          createdBy: { select: { id: true, name: true } },
          submissions: {
            where: studentIds ? { studentId: { in: studentIds } } : undefined,
            orderBy: { student: { name: "asc" } },
            select: {
              id: true,
              status: true,
              studentNote: true,
              teacherFeedback: true,
              openedAt: true,
              submittedAt: true,
              reviewedAt: true,
              storedFileId: true,
              student: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
}

export async function canActorManageGroup(actor: LearningActor, groupId: string): Promise<boolean> {
  if (!["SYSTEM_OWNER", "DIRECTOR", "TEACHER"].includes(actor.role)) return false;
  return Boolean(
    await db.courseGroup.findFirst({
      where: { ...accessibleGroupWhere(actor), id: groupId },
      select: { id: true },
    }),
  );
}
