import type { Prisma } from "@/app/generated/prisma/client";

export type ProgressActor = {
  id: string;
  schoolId: string;
  role: "SYSTEM_OWNER" | "DIRECTOR" | "TEACHER" | "PARENT" | "STUDENT";
};

export function accessibleStudentWhere(actor: ProgressActor): Prisma.UserWhereInput {
  const base = { schoolId: actor.schoolId, role: "STUDENT", archivedAt: null, status: "ACTIVE" } satisfies Prisma.UserWhereInput;
  if (actor.role === "DIRECTOR") return base;
  if (actor.role === "TEACHER") return { ...base, enrollments: { some: { status: "ACTIVE", group: { teachers: { some: { teacherId: actor.id, archivedAt: null } } } } } };
  if (actor.role === "PARENT") return { ...base, childLinks: { some: { schoolId: actor.schoolId, parentId: actor.id, archivedAt: null } } };
  if (actor.role === "STUDENT") return { ...base, id: actor.id };
  return { ...base, id: { in: [] } };
}
