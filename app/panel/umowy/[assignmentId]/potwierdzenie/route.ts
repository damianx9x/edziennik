import { NextResponse } from "next/server";

import { db } from "@/lib/server/db";
import { can } from "@/modules/access-control/can";
import { requireActiveSession, requireDirector } from "@/modules/identity/auth/session";

type AcceptanceEvidence = {
  statementVersion?: string;
  statementText?: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ assignmentId: string }> },
) {
  const { assignmentId } = await context.params;
  const session = await requireActiveSession(
    `/panel/umowy/${assignmentId}/potwierdzenie`,
  );
  if (session.user.role === "DIRECTOR") {
    await requireDirector(`/panel/umowy/${assignmentId}/potwierdzenie`);
  }
  if (!["DIRECTOR", "PARENT"].includes(session.user.role)) {
    return NextResponse.json({ message: "Brak dostępu." }, { status: 403 });
  }

  const assignment = await db.contractAssignment.findFirst({
    where: { id: assignmentId, schoolId: session.user.schoolId },
    select: {
      id: true,
      parentId: true,
      contract: { select: { title: true } },
      version: { select: { version: true, sha256: true } },
      student: { select: { name: true } },
      parent: { select: { name: true } },
      acceptance: {
        select: {
          acceptedAt: true,
          documentHash: true,
          evidence: true,
          acceptedBy: { select: { name: true } },
        },
      },
    },
  });

  const allowed = assignment && can(
    { id: session.user.id, schoolId: session.user.schoolId, role: session.user.role },
    "view:contract",
    { schoolId: session.user.schoolId, parentIds: [assignment.parentId] },
  );
  if (!assignment || !assignment.acceptance || !allowed) {
    return NextResponse.json({ message: "Potwierdzenie nie jest dostępne." }, { status: 403 });
  }

  const evidence = assignment.acceptance.evidence as AcceptanceEvidence;
  const lines = [
    "POTWIERDZENIE AKCEPTACJI UMOWY W EDZIENNIKU KLA",
    "",
    `Umowa: ${assignment.contract.title}`,
    `Wersja: ${assignment.version.version}`,
    `Uczeń: ${assignment.student.name}`,
    `Rodzic: ${assignment.parent.name}`,
    `Osoba akceptująca: ${assignment.acceptance.acceptedBy.name}`,
    `Data i czas: ${assignment.acceptance.acceptedAt.toISOString()}`,
    `SHA-256 dokumentu: ${assignment.acceptance.documentHash}`,
    `Wersja oświadczenia: ${evidence.statementVersion ?? "brak danych"}`,
    "",
    "Złożone oświadczenie:",
    evidence.statementText ?? "Oświadczenie zapisano w starszej wersji pilota.",
    "",
    "To potwierdzenie dotyczy akceptacji w formie dokumentowej. Nie jest",
    "kwalifikowanym podpisem elektronicznym ani jego zamiennikiem.",
  ];

  await db.auditLog.create({
    data: {
      schoolId: session.user.schoolId,
      actorId: session.user.id,
      action: "contracts.acceptance.receipt.downloaded",
      entityType: "ContractAssignment",
      entityId: assignment.id,
      metadata: { documentHash: assignment.version.sha256 },
    },
  });

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="potwierdzenie-umowy-v${assignment.version.version}.txt"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
