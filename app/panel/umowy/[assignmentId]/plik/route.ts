import { NextResponse } from "next/server";

import { db } from "@/lib/server/db";
import { can } from "@/modules/access-control/can";
import { getFileStorage } from "@/modules/files/storage";
import { requireActiveSession, requireDirector } from "@/modules/identity/auth/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ assignmentId: string }> },
) {
  const { assignmentId } = await context.params;
  const session = await requireActiveSession(`/panel/umowy/${assignmentId}/plik`);
  if (session.user.role === "SYSTEM_OWNER" || session.user.role === "DIRECTOR") {
    await requireDirector(`/panel/umowy/${assignmentId}/plik`);
  }
  const assignment = await db.contractAssignment.findFirst({
    where: { id: assignmentId, schoolId: session.user.schoolId },
    select: {
      id: true,
      parentId: true,
      status: true,
      version: {
        select: {
          storedFile: { select: { storageKey: true, originalName: true } },
        },
      },
    },
  });
  const allowed = assignment && can(
    { id: session.user.id, schoolId: session.user.schoolId, role: session.user.role },
    "view:contract",
    { schoolId: session.user.schoolId, parentIds: [assignment.parentId] },
  );
  if (!assignment || !allowed) {
    return NextResponse.json({ message: "Brak dostępu do dokumentu." }, { status: 403 });
  }

  if (session.user.role === "PARENT" && assignment.status === "SENT") {
    await db.contractAssignment.updateMany({
      where: { id: assignment.id, status: "SENT" },
      data: { status: "VIEWED", viewedAt: new Date() },
    });
  }
  await db.auditLog.create({
    data: {
      schoolId: session.user.schoolId,
      actorId: session.user.id,
      action: "contracts.document.viewed",
      entityType: "ContractAssignment",
      entityId: assignment.id,
      metadata: { role: session.user.role },
    },
  });
  const bytes = await getFileStorage().read(assignment.version.storedFile.storageKey);
  const safeName = assignment.version.storedFile.originalName.replace(/[^\p{L}\p{N}._-]+/gu, "-");
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName || "umowa.pdf"}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
