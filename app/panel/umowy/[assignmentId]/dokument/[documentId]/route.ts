import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/server/db";
import { can } from "@/modules/access-control/can";
import { getFileStorage } from "@/modules/files/storage";
import { requireActiveSession, requireDirector } from "@/modules/identity/auth/session";

export async function GET(request: Request, context: { params: Promise<{ assignmentId: string; documentId: string }> }) {
  const { assignmentId, documentId } = await context.params;
  if (!z.string().uuid().safeParse(assignmentId).success || !z.string().uuid().safeParse(documentId).success) {
    return NextResponse.json({ message: "Dokument nie istnieje." }, { status: 404 });
  }
  const session = await requireActiveSession(`/panel/umowy/${assignmentId}/dokument/${documentId}`);
  if (session.user.role === "DIRECTOR") await requireDirector(`/panel/umowy/${assignmentId}/dokument/${documentId}`);
  if (!["DIRECTOR", "PARENT"].includes(session.user.role)) return NextResponse.json({ message: "Brak dostępu do dokumentu." }, { status: 403 });
  const assignment = await db.contractAssignment.findFirst({
    where: { id: assignmentId, schoolId: session.user.schoolId },
    select: { id: true, parentId: true, status: true, versionId: true },
  });
  const allowed = assignment && can({ id: session.user.id, schoolId: session.user.schoolId, role: session.user.role }, "view:contract", { schoolId: session.user.schoolId, parentIds: [assignment.parentId] });
  if (!assignment || !allowed) return NextResponse.json({ message: "Brak dostępu do dokumentu." }, { status: 403 });
  const document = await db.contractDocument.findFirst({ where: { id: documentId, schoolId: session.user.schoolId, versionId: assignment.versionId }, select: { kind: true, storedFile: { select: { storageKey: true, originalName: true } } } });
  if (!document) return NextResponse.json({ message: "Dokument nie istnieje." }, { status: 404 });
  if (session.user.role === "PARENT") {
    await db.$transaction([
      db.contractDocumentView.upsert({
        where: { assignmentId_documentId_userId: { assignmentId: assignment.id, documentId, userId: session.user.id } },
        create: { schoolId: session.user.schoolId, assignmentId: assignment.id, documentId, userId: session.user.id },
        update: { lastViewedAt: new Date() },
      }),
      db.contractAssignment.updateMany({ where: { id: assignment.id, status: "SENT" }, data: { status: "VIEWED", viewedAt: new Date() } }),
      db.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "contracts.package_document.viewed", entityType: "ContractAssignment", entityId: assignment.id, metadata: { documentKind: document.kind, role: session.user.role } } }),
    ]);
  } else {
    await db.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "contracts.package_document.viewed", entityType: "ContractAssignment", entityId: assignment.id, metadata: { documentKind: document.kind, role: session.user.role } } });
  }
  const bytes = await getFileStorage().read(document.storedFile.storageKey);
  const safeName = document.storedFile.originalName.replace(/[^\p{L}\p{N}._-]+/gu, "-");
  const shouldDownload = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(Buffer.from(bytes), { headers: {
    "Content-Type": "application/pdf", "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${safeName || "dokument.pdf"}"`,
    "Cache-Control": "private, no-store", "Content-Security-Policy": "sandbox; default-src 'none'; frame-ancestors 'self'", "X-Frame-Options": "SAMEORIGIN", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
  } });
}
