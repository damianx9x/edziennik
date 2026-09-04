import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/server/db";
import { can } from "@/modules/access-control/can";
import { requireActiveSession, requireDirector } from "@/modules/identity/auth/session";
import { isPrivilegedIdentityRole } from "@/modules/identity/auth/access";
import { requireEnabledModule } from "@/modules/module-access/server";

type AcceptanceEvidence = {
  method?: string;
  signedFileHash?: string;
  statementVersion?: string;
  statementText?: string;
  consumerNoticeVersion?: string;
  consumerNoticeText?: string;
  actionLabel?: string;
  confirmations?: {
    documentRead?: boolean;
    packageDocumentsRead?: Array<{ id?: string; kind?: string; title?: string }>;
    consumerInformationReceived?: boolean;
    paymentObligationAcknowledged?: boolean;
    earlyStartRequested?: boolean;
    earlyStartConsequencesAcknowledged?: boolean;
  };
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ assignmentId: string }> },
) {
  const { assignmentId } = await context.params;
  if (!z.string().uuid().safeParse(assignmentId).success) {
    return NextResponse.json({ message: "Potwierdzenie nie jest dostępne." }, { status: 404 });
  }
  const session = await requireActiveSession(
    `/panel/umowy/${assignmentId}/potwierdzenie`,
  );
  await requireEnabledModule(session, "contracts");
  if (isPrivilegedIdentityRole(session.user.role)) {
    await requireDirector(`/panel/umowy/${assignmentId}/potwierdzenie`);
  }
  if (!(isPrivilegedIdentityRole(session.user.role) || session.user.role === "PARENT")) {
    return NextResponse.json({ message: "Brak dostępu." }, { status: 403 });
  }

  const assignment = await db.contractAssignment.findFirst({
    where: { id: assignmentId, schoolId: session.user.schoolId },
    select: {
      id: true,
      parentId: true,
      version: { select: { title: true, version: true, sha256: true, acceptanceMode: true } },
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
  const isSignedCopy = assignment.version.acceptanceMode === "EXTERNAL_SIGNATURE";
  const lines = [
    isSignedCopy
      ? "POTWIERDZENIE WERYFIKACJI PODPISANEJ UMOWY W EDZIENNIKU KLA"
      : "POTWIERDZENIE AKCEPTACJI UMOWY W EDZIENNIKU KLA",
    "",
    `Umowa: ${assignment.version.title}`,
    `Wersja: ${assignment.version.version}`,
    `Uczeń: ${assignment.student.name}`,
    `Rodzic: ${assignment.parent.name}`,
    `${isSignedCopy ? "Osoba sprawdzająca" : "Osoba akceptująca"}: ${assignment.acceptance.acceptedBy.name}`,
    `Data i czas: ${assignment.acceptance.acceptedAt.toISOString()}`,
    `SHA-256 dokumentu: ${assignment.acceptance.documentHash}`,
    ...(isSignedCopy
      ? [
          "Tryb: podpis odręczny i wgrana kopia dokumentu",
          `SHA-256 podpisanego pliku: ${evidence.signedFileHash ?? assignment.acceptance.documentHash}`,
        ]
      : [
          `Wersja oświadczenia: ${evidence.statementVersion ?? "brak danych"}`,
          `Wersja informacji konsumenckiej: ${evidence.consumerNoticeVersion ?? "brak danych"}`,
          `Przycisk końcowy: ${evidence.actionLabel ?? "brak danych"}`,
        ]),
    "",
    ...(isSignedCopy
      ? [
          "Dyrektor potwierdził zgodność wgranego pliku z przypisaną wersją umowy.",
          "Podpisany dokument jest przechowywany oddzielnie i pozostaje dostępny po sprawdzeniu uprawnień.",
          "To potwierdzenie nie zastępuje papierowego oryginału dokumentu.",
        ]
      : [
          "Złożone oświadczenie:",
          evidence.statementText ?? "Oświadczenie zapisano w starszej wersji pilota.",
          "",
          "Potwierdzenia:",
          `- dokument przeczytany: ${evidence.confirmations?.documentRead ? "tak" : "brak danych"}`,
          ...(evidence.confirmations?.packageDocumentsRead?.length
            ? evidence.confirmations.packageDocumentsRead.map((document) => `- odczytano: ${document.title ?? document.kind ?? "dokument pakietu"}`)
            : []),
          `- informacje konsumenckie otrzymane: ${evidence.confirmations?.consumerInformationReceived ? "tak" : "brak danych"}`,
          `- obowiązek zapłaty potwierdzony: ${evidence.confirmations?.paymentObligationAcknowledged ? "tak" : "nie dotyczy / brak danych"}`,
          `- wcześniejsze rozpoczęcie zażądane: ${evidence.confirmations?.earlyStartRequested ? "tak" : "nie dotyczy / brak danych"}`,
          `- konsekwencje wcześniejszego startu przyjęte: ${evidence.confirmations?.earlyStartConsequencesAcknowledged ? "tak" : "nie dotyczy / brak danych"}`,
          "",
          "Informacja konsumencka zapisana przy akceptacji:",
          evidence.consumerNoticeText ?? "Brak w starszej wersji pilota.",
          "",
          "To potwierdzenie dotyczy akceptacji w formie dokumentowej. Nie jest",
          "kwalifikowanym podpisem elektronicznym ani jego zamiennikiem.",
        ]),
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
