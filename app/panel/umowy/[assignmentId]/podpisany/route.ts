import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/server/db";
import { getFileStorage } from "@/modules/files/storage";
import { requireActiveSession, requireDirector } from "@/modules/identity/auth/session";
import { isPrivilegedIdentityRole } from "@/modules/identity/auth/access";

export async function GET(_request: Request, context: { params: Promise<{ assignmentId: string }> }) {
  const session = await requireActiveSession("/panel/umowy");
  const { assignmentId } = await context.params;
  if (!z.string().uuid().safeParse(assignmentId).success) return new NextResponse("Nie znaleziono dokumentu.", { status: 404 });
  if (isPrivilegedIdentityRole(session.user.role)) await requireDirector("/panel/umowy");
  const assignment = await db.contractAssignment.findFirst({
    where: {
      id: assignmentId,
      schoolId: session.user.schoolId,
      ...(isPrivilegedIdentityRole(session.user.role) ? {} : { parentId: session.user.id }),
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
