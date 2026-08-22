import { NextResponse } from "next/server";

import { db } from "@/lib/server/db";
import { getFileStorage } from "@/modules/files/storage";
import { requireActiveSession } from "@/modules/identity/auth/session";

export async function GET(_request: Request, context: { params: Promise<{ assignmentId: string }> }) {
  const session = await requireActiveSession("/panel/umowy");
  const { assignmentId } = await context.params;
  const assignment = await db.contractAssignment.findFirst({
    where: {
      id: assignmentId,
      schoolId: session.user.schoolId,
      ...(session.user.role === "DIRECTOR" ? {} : { parentId: session.user.id }),
      signedFileId: { not: null },
    },
    select: { id: true, signedFile: { select: { storageKey: true, originalName: true, mimeType: true, sha256: true } } },
  });
  if (!assignment?.signedFile) return new NextResponse("Nie znaleziono dokumentu.", { status: 404 });
  const bytes = await getFileStorage().read(assignment.signedFile.storageKey);
  await db.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "contracts.signed_file.downloaded", entityType: "ContractAssignment", entityId: assignment.id, metadata: { fileHash: assignment.signedFile.sha256 } } });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": assignment.signedFile.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(assignment.signedFile.originalName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
