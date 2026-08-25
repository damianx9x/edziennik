"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/server/db";
import { getFileStorage } from "@/modules/files/storage";
import { requireActiveSession } from "@/modules/identity/auth/session";

import { canPublishLearningContent, canSubmitHomework } from "./access";
import { detectLearningFileType } from "./file-validation";
import {
  homeworkAssignmentSchema,
  homeworkReviewSchema,
  homeworkSubmissionSchema,
  learningMaterialSchema,
  type LearningActionState,
} from "./schema";
import { canActorManageGroup } from "./service";

const learningPath = "/panel/nauka";
const MAX_FILE_BYTES = 15 * 1024 * 1024;

function actorFromSession(session: Awaited<ReturnType<typeof requireActiveSession>>) {
  return { id: session.user.id, schoolId: session.user.schoolId, role: session.user.role };
}

function error(message: string): LearningActionState {
  return { status: "error", message };
}

function refreshLearningPages() {
  revalidatePath(learningPath);
  revalidatePath("/panel/uczen");
  revalidatePath("/panel/rodzic");
  revalidatePath("/panel/wykladowca");
}

export async function createLearningMaterialAction(
  _previous: LearningActionState,
  formData: FormData,
): Promise<LearningActionState> {
  const session = await requireActiveSession(learningPath);
  if (!canPublishLearningContent(session.user.role)) return error("Nie masz uprawnień do publikowania materiałów.");
  const parsed = learningMaterialSchema.safeParse({
    groupId: formData.get("groupId"),
    title: formData.get("title"),
    description: formData.get("description"),
    externalUrl: formData.get("externalUrl"),
  });
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Sprawdź dane materiału.");
  const actor = actorFromSession(session);
  if (!(await canActorManageGroup(actor, parsed.data.groupId))) return error("Nie masz dostępu do tej grupy.");

  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile === Boolean(parsed.data.externalUrl)) return error("Dodaj jeden plik albo jeden bezpieczny link.");

  const storage = getFileStorage();
  let uploaded: Awaited<ReturnType<typeof storage.put>> | undefined;
  try {
    let uploadMetadata: { originalName: string; mimeType: "application/pdf" | "image/jpeg" | "image/png" } | undefined;
    if (hasFile) {
      if (file.size > MAX_FILE_BYTES) return error("Plik może mieć maksymalnie 15 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mimeType = detectLearningFileType(bytes);
      if (!mimeType) return error("Dozwolony jest prawidłowy PDF, JPG albo PNG.");
      uploaded = await storage.put({ schoolId: session.user.schoolId, bytes });
      uploadMetadata = { originalName: file.name.slice(0, 180), mimeType };
    }
    await db.$transaction(async (tx) => {
      const storedFile = uploaded && uploadMetadata
        ? await tx.storedFile.create({
            data: { schoolId: session.user.schoolId, uploadedById: session.user.id, storageKey: uploaded.storageKey, originalName: uploadMetadata.originalName, mimeType: uploadMetadata.mimeType, sizeBytes: uploaded.sizeBytes, sha256: uploaded.sha256, purpose: "LEARNING_MATERIAL" },
            select: { id: true },
          })
        : undefined;
      const material = await tx.learningMaterial.create({
        data: { schoolId: session.user.schoolId, groupId: parsed.data.groupId, createdById: session.user.id, storedFileId: storedFile?.id, title: parsed.data.title, description: parsed.data.description, externalUrl: parsed.data.externalUrl },
        select: { id: true },
      });
      await tx.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "learning.material.published", entityType: "LearningMaterial", entityId: material.id } });
    });
  } catch {
    if (uploaded) await storage.remove(uploaded.storageKey).catch(() => undefined);
    return error("Nie udało się opublikować materiału. Spróbuj ponownie.");
  }
  refreshLearningPages();
  return { status: "success", message: "Materiał jest już widoczny dla grupy." };
}

export async function createHomeworkAssignmentAction(
  _previous: LearningActionState,
  formData: FormData,
): Promise<LearningActionState> {
  const session = await requireActiveSession(learningPath);
  if (!canPublishLearningContent(session.user.role)) return error("Nie masz uprawnień do dodawania zadań.");
  const parsed = homeworkAssignmentSchema.safeParse({
    groupId: formData.get("groupId"),
    title: formData.get("title"),
    instructions: formData.get("instructions"),
    dueAt: formData.get("dueAt"),
  });
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Sprawdź dane zadania.");
  const actor = actorFromSession(session);
  if (!(await canActorManageGroup(actor, parsed.data.groupId))) return error("Nie masz dostępu do tej grupy.");

  await db.$transaction(async (tx) => {
    const assignment = await tx.homeworkAssignment.create({
      data: { schoolId: session.user.schoolId, groupId: parsed.data.groupId, createdById: session.user.id, title: parsed.data.title, instructions: parsed.data.instructions, dueAt: parsed.data.dueAt },
      select: { id: true },
    });
    const students = await tx.enrollment.findMany({ where: { groupId: parsed.data.groupId, status: "ACTIVE" }, select: { studentId: true } });
    if (students.length > 0) {
      await tx.homeworkSubmission.createMany({ data: students.map(({ studentId }) => ({ schoolId: session.user.schoolId, assignmentId: assignment.id, studentId })) });
    }
    await tx.auditLog.create({
      data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "learning.homework.published", entityType: "HomeworkAssignment", entityId: assignment.id, metadata: { recipientCount: students.length } },
    });
  });
  refreshLearningPages();
  return { status: "success", message: "Zadanie zostało opublikowane dla grupy." };
}

export async function markHomeworkOpenedAction(formData: FormData): Promise<void> {
  const session = await requireActiveSession(learningPath);
  if (!canSubmitHomework(session.user.role)) return;
  const assignmentId = String(formData.get("assignmentId") ?? "");
  if (!assignmentId) return;
  await db.homeworkSubmission.updateMany({
    where: { assignmentId, studentId: session.user.id, schoolId: session.user.schoolId, status: "NOT_OPENED", assignment: { archivedAt: null, group: { enrollments: { some: { studentId: session.user.id, status: "ACTIVE" } } } } },
    data: { status: "OPENED", openedAt: new Date() },
  });
  refreshLearningPages();
}

export async function submitHomeworkAction(
  _previous: LearningActionState,
  formData: FormData,
): Promise<LearningActionState> {
  const session = await requireActiveSession(learningPath);
  if (!canSubmitHomework(session.user.role)) return error("Tylko uczeń może oddać swoją pracę.");
  const parsed = homeworkSubmissionSchema.safeParse({ assignmentId: formData.get("assignmentId"), studentNote: formData.get("studentNote") });
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Sprawdź dane pracy.");
  const submission = await db.homeworkSubmission.findFirst({
    where: { assignmentId: parsed.data.assignmentId, studentId: session.user.id, schoolId: session.user.schoolId, assignment: { archivedAt: null, group: { enrollments: { some: { studentId: session.user.id, status: "ACTIVE" } } } } },
    select: { id: true, assignment: { select: { dueAt: true } } },
  });
  if (!submission) return error("To zadanie nie jest przypisane do Twojej aktywnej grupy.");
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (!hasFile && !parsed.data.studentNote) return error("Dodaj plik albo krótką odpowiedź.");

  const storage = getFileStorage();
  let uploaded: Awaited<ReturnType<typeof storage.put>> | undefined;
  try {
    let uploadMetadata: { originalName: string; mimeType: "application/pdf" | "image/jpeg" | "image/png" } | undefined;
    if (hasFile) {
      if (file.size > MAX_FILE_BYTES) return error("Plik może mieć maksymalnie 15 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mimeType = detectLearningFileType(bytes);
      if (!mimeType) return error("Dozwolony jest prawidłowy PDF, JPG albo PNG.");
      uploaded = await storage.put({ schoolId: session.user.schoolId, bytes });
      uploadMetadata = { originalName: file.name.slice(0, 180), mimeType };
    }
    const now = new Date();
    await db.$transaction(async (tx) => {
      const storedFile = uploaded && uploadMetadata
        ? await tx.storedFile.create({ data: { schoolId: session.user.schoolId, uploadedById: session.user.id, storageKey: uploaded.storageKey, originalName: uploadMetadata.originalName, mimeType: uploadMetadata.mimeType, sizeBytes: uploaded.sizeBytes, sha256: uploaded.sha256, purpose: "HOMEWORK_SUBMISSION" }, select: { id: true } })
        : undefined;
      await tx.homeworkSubmission.update({
        where: { id: submission.id },
        data: { status: submission.assignment.dueAt && now > submission.assignment.dueAt ? "LATE" : "SUBMITTED", studentNote: parsed.data.studentNote, storedFileId: storedFile?.id, submittedAt: now, reviewedAt: null, reviewedById: null, teacherFeedback: null, openedAt: now },
      });
      await tx.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "learning.homework.submitted", entityType: "HomeworkSubmission", entityId: submission.id, metadata: { hasFile } } });
    });
  } catch {
    if (uploaded) await storage.remove(uploaded.storageKey).catch(() => undefined);
    return error("Nie udało się oddać pracy. Spróbuj ponownie.");
  }
  refreshLearningPages();
  return { status: "success", message: "Praca została przekazana wykładowcy." };
}

export async function reviewHomeworkAction(
  _previous: LearningActionState,
  formData: FormData,
): Promise<LearningActionState> {
  const session = await requireActiveSession(learningPath);
  if (!canPublishLearningContent(session.user.role)) return error("Nie masz uprawnień do sprawdzania prac.");
  const parsed = homeworkReviewSchema.safeParse({ submissionId: formData.get("submissionId"), feedback: formData.get("feedback") });
  if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Dodaj informację zwrotną.");
  const submission = await db.homeworkSubmission.findFirst({ where: { id: parsed.data.submissionId, schoolId: session.user.schoolId, status: { in: ["SUBMITTED", "LATE", "REVIEWED"] } }, select: { id: true, assignment: { select: { groupId: true } } } });
  if (!submission || !(await canActorManageGroup(actorFromSession(session), submission.assignment.groupId))) return error("Nie masz dostępu do tej pracy.");
  await db.$transaction([
    db.homeworkSubmission.update({ where: { id: submission.id }, data: { status: "REVIEWED", teacherFeedback: parsed.data.feedback, reviewedById: session.user.id, reviewedAt: new Date() } }),
    db.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "learning.homework.reviewed", entityType: "HomeworkSubmission", entityId: submission.id } }),
  ]);
  refreshLearningPages();
  return { status: "success", message: "Informacja zwrotna jest już widoczna dla ucznia i rodzica." };
}
