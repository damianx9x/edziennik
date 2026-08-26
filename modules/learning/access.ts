import type { Prisma } from "@/app/generated/prisma/client";

export type LearningActor = {
  id: string;
  schoolId: string;
  role: "SYSTEM_OWNER" | "DIRECTOR" | "TEACHER" | "PARENT" | "STUDENT";
};

/** Jedno źródło zakresu danych modułu nauki. */
export function accessibleGroupWhere(actor: LearningActor): Prisma.CourseGroupWhereInput {
  const base = { schoolId: actor.schoolId, archivedAt: null, isActive: true } satisfies Prisma.CourseGroupWhereInput;
  if (actor.role === "SYSTEM_OWNER" || actor.role === "DIRECTOR") return base;
  if (actor.role === "TEACHER") {
    return { ...base, teachers: { some: { teacherId: actor.id, archivedAt: null } } };
  }
  if (actor.role === "STUDENT") {
    return { ...base, enrollments: { some: { studentId: actor.id, status: "ACTIVE" } } };
  }
  if (actor.role === "PARENT") {
    return {
      ...base,
      enrollments: {
        some: {
          status: "ACTIVE",
          student: { childLinks: { some: { schoolId: actor.schoolId, parentId: actor.id, archivedAt: null } } },
        },
      },
    };
  }
  return { ...base, id: { in: [] } };
}

export function canPublishLearningContent(role: LearningActor["role"]): boolean {
  return role === "SYSTEM_OWNER" || role === "DIRECTOR" || role === "TEACHER";
}

export function canSubmitHomework(role: LearningActor["role"]): boolean {
  return role === "STUDENT";
}
