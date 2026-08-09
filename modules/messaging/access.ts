import { cache } from "react";

import { db } from "@/lib/server/db";
import { can, type Actor, type Resource } from "@/modules/access-control/can";
import type { ActiveSession } from "@/modules/identity/auth/session";

export const getAccessibleGroups = cache(async function getAccessibleGroups(session: ActiveSession) {
  const base = {
    schoolId: session.user.schoolId,
    isActive: true,
    archivedAt: null,
  } as const;

  if (session.user.role === "DIRECTOR") {
    return db.courseGroup.findMany({
      where: base,
      orderBy: [{ location: { name: "asc" } }, { name: "asc" }],
      select: groupSelect,
    });
  }
  if (session.user.role === "TEACHER") {
    return db.courseGroup.findMany({
      where: { ...base, teachers: { some: { teacherId: session.user.id, archivedAt: null } } },
      orderBy: { name: "asc" },
      select: groupSelect,
    });
  }
  if (session.user.role === "STUDENT") {
    return db.courseGroup.findMany({
      where: { ...base, enrollments: { some: { studentId: session.user.id, status: "ACTIVE" } } },
      orderBy: { name: "asc" },
      select: groupSelect,
    });
  }
  if (session.user.role === "PARENT") {
    return db.courseGroup.findMany({
      where: {
        ...base,
        enrollments: {
          some: {
            status: "ACTIVE",
            student: { childLinks: { some: { parentId: session.user.id, archivedAt: null } } },
          },
        },
      },
      orderBy: { name: "asc" },
      select: groupSelect,
    });
  }
  return [];
});

const groupSelect = {
  id: true,
  name: true,
  location: { select: { name: true } },
  _count: { select: { teachers: { where: { archivedAt: null } }, enrollments: { where: { status: "ACTIVE" as const } } } },
  conversation: {
    select: {
      id: true,
      updatedAt: true,
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: "desc" as const }, take: 1, select: { createdAt: true } },
    },
  },
} as const;

export async function getConversationResource(groupId: string, schoolId: string): Promise<Resource | null> {
  const group = await db.courseGroup.findFirst({
    where: { id: groupId, schoolId, isActive: true, archivedAt: null },
    select: {
      schoolId: true,
      teachers: { where: { archivedAt: null }, select: { teacherId: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        select: {
          studentId: true,
          student: { select: { childLinks: { where: { archivedAt: null }, select: { parentId: true } } } },
        },
      },
    },
  });
  if (!group) return null;
  return {
    schoolId: group.schoolId,
    teacherIds: group.teachers.map((item) => item.teacherId),
    studentIds: group.enrollments.map((item) => item.studentId),
    parentIds: [...new Set(group.enrollments.flatMap((item) => item.student.childLinks.map((link) => link.parentId)))],
  };
}

export async function canUseGroupConversation(session: ActiveSession, groupId: string) {
  const resource = await getConversationResource(groupId, session.user.schoolId);
  if (!resource) return false;
  const actor: Actor = { id: session.user.id, schoolId: session.user.schoolId, role: session.user.role };
  return can(actor, "send:group-message", resource);
}

export async function canUseConversation(session: ActiveSession, conversationId: string) {
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, schoolId: session.user.schoolId, archivedAt: null },
    select: {
      kind: true,
      groupId: true,
      participants: { where: { userId: session.user.id, archivedAt: null }, select: { userId: true } },
    },
  });
  if (!conversation) return false;
  const actor: Actor = { id: session.user.id, schoolId: session.user.schoolId, role: session.user.role };
  if (conversation.kind === "DIRECT") return can(actor, "send:group-message", { schoolId: session.user.schoolId, participantIds: conversation.participants.map((item) => item.userId) });
  if (session.user.role === "DIRECTOR") return can(actor, "send:group-message", { schoolId: session.user.schoolId });
  return Boolean(conversation.groupId && await canUseGroupConversation(session, conversation.groupId));
}

export async function getConversationRecipientIds(conversationId: string, schoolId: string, excludeId?: string) {
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, schoolId, archivedAt: null },
    select: {
      kind: true,
      groupId: true,
      participants: { where: { archivedAt: null }, select: { userId: true } },
    },
  });
  if (!conversation) return [];
  const ids = conversation.kind === "DIRECT"
    ? conversation.participants.map((item) => item.userId)
    : conversation.groupId ? await getGroupRecipientIds(conversation.groupId, schoolId) : [];
  return [...new Set(ids)].filter((id) => id !== excludeId);
}

export async function getDirectConversations(session: ActiveSession) {
  return db.conversation.findMany({
    where: {
      schoolId: session.user.schoolId,
      kind: "DIRECT",
      archivedAt: null,
      ...(session.user.role === "DIRECTOR" ? {} : { participants: { some: { userId: session.user.id, archivedAt: null } } }),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      participants: {
        where: { archivedAt: null },
        orderBy: { user: { name: "asc" } },
        select: { user: { select: { id: true, name: true, role: true } } },
      },
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });
}

export async function getGroupRecipientIds(groupId: string, schoolId: string, excludeId?: string) {
  const resource = await getConversationResource(groupId, schoolId);
  if (!resource) return [];
  return [...new Set([...(resource.teacherIds ?? []), ...(resource.studentIds ?? []), ...(resource.parentIds ?? [])])]
    .filter((id) => id !== excludeId);
}
