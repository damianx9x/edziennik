"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/server/db";
import { requireActiveSession } from "@/modules/identity/auth/session";

import { progressObservationSchema, type ProgressActionState } from "./schema";
import { canRecordStudentProgress, type ProgressActor } from "./service";

const progressPath = "/panel/postepy";

export async function createProgressObservationAction(
  _previous: ProgressActionState,
  formData: FormData,
): Promise<ProgressActionState> {
  const session = await requireActiveSession(progressPath);
  const parsed = progressObservationSchema.safeParse({
    studentId: formData.get("studentId"),
    scheduleSlotId: formData.get("scheduleSlotId"),
    speaking: formData.get("speaking"),
    listening: formData.get("listening"),
    reading: formData.get("reading"),
    writing: formData.get("writing"),
    vocabulary: formData.get("vocabulary"),
    grammar: formData.get("grammar"),
    engagement: formData.get("engagement"),
    note: formData.get("note"),
    observedAt: formData.get("observedAt"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Sprawdź obserwację." };
  const actor: ProgressActor = { id: session.user.id, schoolId: session.user.schoolId, role: session.user.role };
  if (!(await canRecordStudentProgress(actor, parsed.data.studentId))) {
    return { status: "error", message: "Nie masz dostępu do postępów tego ucznia." };
  }

  if (parsed.data.scheduleSlotId) {
    const lesson = await db.scheduleSlot.findFirst({
      where: {
        id: parsed.data.scheduleSlotId,
        schoolId: session.user.schoolId,
        group: { enrollments: { some: { studentId: parsed.data.studentId, status: "ACTIVE" } } },
        ...(session.user.role === "TEACHER" ? { teacherId: session.user.id } : {}),
      },
      select: { id: true },
    });
    if (!lesson) return { status: "error", message: "Wybrana lekcja nie dotyczy tego ucznia lub nie masz do niej dostępu." };
  }

  try {
    const observation = await db.$transaction(async (tx) => {
      const created = await tx.studentProgressObservation.create({
        data: {
          schoolId: session.user.schoolId,
          studentId: parsed.data.studentId,
          recordedById: session.user.id,
          scheduleSlotId: parsed.data.scheduleSlotId,
          speaking: parsed.data.speaking,
          listening: parsed.data.listening,
          reading: parsed.data.reading,
          writing: parsed.data.writing,
          vocabulary: parsed.data.vocabulary,
          grammar: parsed.data.grammar,
          engagement: parsed.data.engagement,
          note: parsed.data.note,
          observedAt: parsed.data.observedAt,
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "progress.observation.created", entityType: "StudentProgressObservation", entityId: created.id, metadata: { studentId: parsed.data.studentId, scheduleSlotId: parsed.data.scheduleSlotId ?? null } },
      });
      return created;
    });
    void observation;
  } catch {
    return { status: "error", message: parsed.data.scheduleSlotId ? "Dla tej lekcji zapisano już obserwację ucznia." : "Nie udało się zapisać obserwacji." };
  }
  revalidatePath(progressPath);
  revalidatePath("/panel/uczen");
  revalidatePath("/panel/rodzic");
  return { status: "success", message: "Obserwacja została zapisana. Wykres nie służy do automatycznej oceny ucznia." };
}

