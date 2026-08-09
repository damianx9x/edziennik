import {
  FileText,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { db } from "@/lib/server/db";
import { ContractCreateForm } from "@/modules/contracts/components/contract-create-form";
import { ContractList } from "@/modules/contracts/components/contract-list";
import {
  getContractAcceptanceStatement,
  getContractActionLabel,
} from "@/modules/contracts/legal";
import { requireActiveSession } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";

export const metadata: Metadata = { title: "Umowy online" };
export const dynamic = "force-dynamic";

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ rodzic?: string; umowa?: string }> }) {
  const session = await requireActiveSession("/panel/umowy");
  if (!["DIRECTOR", "PARENT"].includes(session.user.role)) {
    redirect("/panel/brak-dostepu");
  }

  const isManagement = session.user.role === "DIRECTOR";
  const params = await searchParams;
  const parentId = isManagement && params.rodzic ? params.rodzic : undefined;
  const assignments = await db.contractAssignment.findMany({
    where: {
      schoolId: session.user.schoolId,
      ...(isManagement ? parentId ? { parentId } : {} : { parentId: session.user.id }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      version: {
        select: {
          version: true,
          sha256: true,
          title: true,
          acceptanceMode: true,
          serviceSummary: true,
          requiresPayment: true,
          paymentSummary: true,
          paymentAmountCents: true,
          paymentLabel: true,
          paymentDueDate: true,
          storedFile: { select: { originalName: true, sizeBytes: true } },
        },
      },
      parent: { select: { id: true, name: true } },
      student: { select: { name: true } },
      acceptance: { select: { acceptedAt: true } },
    },
  });

  const parents = isManagement
    ? await db.user.findMany({
        where: { schoolId: session.user.schoolId, role: "PARENT", status: "ACTIVE", archivedAt: null },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          parentLinks: {
            where: {
              archivedAt: null,
              child: { status: "ACTIVE", role: "STUDENT", archivedAt: null },
            },
            select: { child: { select: { id: true, name: true } } },
          },
        },
      })
    : [];

  return (
    <AuthenticatedPanelShell session={session} active="contracts">
      <header className="stage4-heading">
        <div>
          <span className="section-kicker">Etap 4 · umowy online</span>
          <h1>{isManagement ? "Umowy bez papierowego chaosu" : "Dokumenty do sprawdzenia"}</h1>
          <p>
            {isManagement
              ? "Każda wysłana wersja ma własny plik, skrót i historię akceptacji."
              : "Najpierw otwórz PDF. Potem świadomie zaakceptuj dokładnie tę wersję."}
          </p>
        </div>
        <span className="role-security-chip"><ShieldCheck aria-hidden="true" /> Niezmienna wersja PDF</span>
      </header>

      {isManagement ? (
        <ContractCreateForm
          parents={parents.map((parent) => ({
            id: parent.id,
            name: parent.name,
            children: parent.parentLinks.map((link) => link.child),
          }))}
        />
      ) : null}

      <section className="stage4-list-section">
        <div className="stage4-section-title">
          <div>
            <span className="section-kicker">Historia</span>
            <h2>{isManagement ? "Wysłane umowy" : "Twoje umowy"}</h2>
          </div>
          <span>{assignments.length} {assignments.length === 1 ? "dokument" : "dokumentów"}</span>
        </div>
        {parentId ? <a className="stage4-filter-reset" href="/panel/umowy">Pokaż umowy wszystkich rodziców</a> : null}
        {assignments.length === 0 ? (
          <div className="stage4-empty">
            <FileText aria-hidden="true" />
            <h3>Nie ma jeszcze żadnej umowy</h3>
            <p>{isManagement ? "Użyj formularza powyżej, aby wysłać pierwszą wersję." : "Szkoła powiadomi Cię, gdy dokument będzie gotowy."}</p>
          </div>
        ) : (
          <ContractList
            isManagement={isManagement}
            initialSelectedId={params.umowa}
            items={assignments.map((assignment) => {
              const expired = Boolean(
                assignment.expiresAt &&
                assignment.expiresAt < new Date() &&
                assignment.status !== "ACCEPTED",
              );
              return {
                id: assignment.id,
                contractId: assignment.contractId,
                title: assignment.version.title,
                status: expired ? "EXPIRED" : assignment.status,
                version: assignment.version.version,
                sha256: assignment.version.sha256,
                fileName: assignment.version.storedFile.originalName,
                sizeLabel: `${(assignment.version.storedFile.sizeBytes / 1024).toFixed(0)} KB`,
                parentName: assignment.parent.name,
                parentId: assignment.parent.id,
                studentName: assignment.student.name,
                sentAt: assignment.sentAt.toISOString(),
                viewedAt: assignment.viewedAt?.toISOString() ?? null,
                expiresAt: assignment.expiresAt?.toISOString() ?? null,
                acceptedAt: assignment.acceptance?.acceptedAt.toISOString() ?? null,
                acceptanceMode: assignment.version.acceptanceMode,
                serviceSummary: assignment.version.serviceSummary,
                requiresPayment: assignment.version.requiresPayment,
                paymentSummary: assignment.version.paymentSummary,
                paymentAmountCents: assignment.version.paymentAmountCents,
                paymentLabel: assignment.version.paymentLabel,
                paymentDueDate: assignment.version.paymentDueDate?.toISOString() ?? null,
                acceptanceStatement: getContractAcceptanceStatement({
                  title: assignment.version.title,
                  version: assignment.version.version,
                  serviceSummary: assignment.version.serviceSummary,
                  requiresPayment: assignment.version.requiresPayment,
                  paymentSummary: assignment.version.paymentSummary,
                  paymentAmountCents: assignment.version.paymentAmountCents,
                  paymentLabel: assignment.version.paymentLabel,
                  paymentDueDate: assignment.version.paymentDueDate?.toLocaleDateString("pl-PL") ?? null,
                }),
                actionLabel: getContractActionLabel(assignment.version.requiresPayment),
              };
            })}
          />
        )}
      </section>

      <p className="stage4-legal-note">
        Akceptacja w eDzienniku utrwala oświadczenie w formie dokumentowej. Nie
        zastępuje kwalifikowanego podpisu elektronicznego, gdy prawo albo sama
        umowa wymagają formy pisemnej. Treść wzorca i obowiązki konsumenckie
        muszą zostać zatwierdzone przed użyciem z prawdziwymi danymi.
      </p>
    </AuthenticatedPanelShell>
  );
}
