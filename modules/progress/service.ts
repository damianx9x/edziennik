import { db } from "@/lib/server/db";
import { accessibleStudentWhere, type ProgressActor } from "./access";

export { accessibleStudentWhere, type ProgressActor } from "./access";
export { buildDescriptiveProgressSummary, progressSkills, type ProgressPoint, type ProgressSkill } from "./summary";

export async function listStudentProgress(actor: ProgressActor) {
  return db.user.findMany({
    where: accessibleStudentWhere(actor),
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      enrollments: { where: { status: "ACTIVE" }, select: { group: { select: { id: true, name: true } } } },
      progressAsStudent: {
        orderBy: { observedAt: "asc" },
        select: {
          id: true,
          speaking: true,
          listening: true,
          reading: true,
          writing: true,
          vocabulary: true,
          grammar: true,
          engagement: true,
          note: true,
          observedAt: true,
          recordedBy: { select: { id: true, name: true } },
          scheduleSlot: { select: { id: true, startAt: true, topic: true, group: { select: { id: true, name: true } } } },
        },
      },
      attendanceAsStudent: {
        orderBy: { scheduleSlot: { startAt: "desc" } },
        take: 30,
        select: { status: true, scheduleSlot: { select: { id: true, startAt: true, group: { select: { id: true, name: true } } } } },
      },
    },
  });
}

export async function canRecordStudentProgress(actor: ProgressActor, studentId: string): Promise<boolean> {
  if (actor.role !== "DIRECTOR" && actor.role !== "TEACHER") return false;
  return Boolean(await db.user.findFirst({ where: { ...accessibleStudentWhere(actor), id: studentId }, select: { id: true } }));
}
