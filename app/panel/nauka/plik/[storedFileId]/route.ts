import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/server/db";
import { getFileStorage } from "@/modules/files/storage";
import { requireActiveSession } from "@/modules/identity/auth/session";
import { accessibleGroupWhere } from "@/modules/learning/access";
import { canViewLearningStoredFile } from "@/modules/learning/file-access";

export async function GET(
  _request: Request,
  context: { params: Promise<{ storedFileId: string }> },
) {
  const { storedFileId } = await context.params;
  if (!z.string().uuid().safeParse(storedFileId).success) {
    return NextResponse.json({ message: "Plik nie istnieje." }, { status: 404 });
  }

  const session = await requireActiveSession(`/panel/nauka/plik/${storedFileId}`);
  if (session.user.role === "SYSTEM_OWNER") {
    return NextResponse.json({ message: "Brak dostępu do pliku." }, { status: 403 });
  }
  const actor = { id: session.user.id, schoolId: session.user.schoolId, role: session.user.role };
  const storedFile = await db.storedFile.findFirst({
    where: { id: storedFileId, schoolId: session.user.schoolId, archivedAt: null },
    select: {
      id: true,
      storageKey: true,
      originalName: true,
      mimeType: true,
      learningMaterials: { where: { archivedAt: null }, select: { groupId: true } },
      homeworkSubmissions: { select: { studentId: true, assignment: { select: { groupId: true } } } },
    },
  });
  if (!storedFile) return NextResponse.json({ message: "Plik nie istnieje." }, { status: 404 });

  const candidateGroupIds = [
    ...storedFile.learningMaterials.map((material) => material.groupId),
    ...storedFile.homeworkSubmissions.map((submission) => submission.assignment.groupId),
  ];
  const hasAccessibleGroup = candidateGroupIds.length > 0 && Boolean(await db.courseGroup.findFirst({
    where: { ...accessibleGroupWhere(actor), id: { in: candidateGroupIds } },
    select: { id: true },
  }));
  const isOwnSubmission = session.user.role === "STUDENT" && storedFile.homeworkSubmissions.some((submission) => submission.studentId === session.user.id);
  const isLinkedChildSubmission = session.user.role === "PARENT" && Boolean(await db.parentChild.findFirst({
    where: {
      schoolId: session.user.schoolId,
      parentId: session.user.id,
      childId: { in: storedFile.homeworkSubmissions.map((submission) => submission.studentId) },
      archivedAt: null,
    },
    select: { childId: true },
  }));
  if (!canViewLearningStoredFile({
    role: session.user.role,
    hasAccessibleGroup,
    containsHomeworkSubmission: storedFile.homeworkSubmissions.length > 0,
    isOwnSubmission,
    isLinkedChildSubmission: Boolean(isLinkedChildSubmission),
  })) {
    return NextResponse.json({ message: "Brak dostępu do pliku." }, { status: 403 });
  }

  await db.auditLog.create({
    data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "learning.file.viewed", entityType: "StoredFile", entityId: storedFile.id },
  });
  const bytes = await getFileStorage().read(storedFile.storageKey);
  const safeName = storedFile.originalName.replace(/[^\p{L}\p{N}._-]+/gu, "-") || "material";
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": storedFile.mimeType,
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "sandbox; default-src 'none'; frame-ancestors 'self'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
