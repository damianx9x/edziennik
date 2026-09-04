import {
  CircleHelp,
  FileText,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/lib/server/db";
import { ContractCreateForm } from "@/modules/contracts/components/contract-create-form";
import { ContractList } from "@/modules/contracts/components/contract-list";
import { CONTRACT_ELIGIBLE_PERSON_STATUSES } from "@/modules/contracts/eligibility";
import {
  getContractAcceptanceStatement,
  getContractActionLabel,
} from "@/modules/contracts/legal";
import { requireActiveSession } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { isPrivilegedIdentityRole } from "@/modules/identity/auth/access";
import { requireEnabledModule } from "@/modules/module-access/server";

export const metadata: Metadata = { title: "Umowy online" };
export const dynamic = "force-dynamic";

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ rodzic?: string; umowa?: string }> }) {
  const session = await requireActiveSession("/panel/umowy");
  await requireEnabledModule(session, "contracts");
  if (!(isPrivilegedIdentityRole(session.user.role) || session.user.role === "PARENT")) {
    redirect("/panel/brak-dostepu");
  }

  const isManagement = isPrivilegedIdentityRole(session.user.role);
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
          serviceStartDate: true,
          serviceEndDate: true,
          cancellationSummary: true,
          requiresEarlyStartRequest: true,
          installmentCount: true,
          installmentAmountCents: true,
          totalAmountCents: true,
          documents: {
            orderBy: { position: "asc" },
            select: { id: true, kind: true, title: true, storedFile: { select: { originalName: true, sizeBytes: true } } },
          },
          storedFile: { select: { originalName: true, sizeBytes: true } },
        },
      },
      parent: { select: { id: true, name: true } },
      student: { select: { name: true } },
      acceptance: { select: { acceptedAt: true } },
      documentViews: {
        where: { userId: session.user.id },
        select: { documentId: true },
      },
      signedFile: { select: { originalName: true, sizeBytes: true, sha256: true } },
    },
  });

  const parents = isManagement
    ? await db.user.findMany({
        where: { schoolId: session.user.schoolId, role: "PARENT", status: { in: [...CONTRACT_ELIGIBLE_PERSON_STATUSES] }, archivedAt: null },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          status: true,
          parentLinks: {
            where: {
              archivedAt: null,
              child: {
                status: { in: [...CONTRACT_ELIGIBLE_PERSON_STATUSES] },
                role: "STUDENT",
                archivedAt: null,
              },
            },
            select: { child: { select: { id: true, name: true } } },
          },
        },
      })
    : [];
  const reusablePackages = isManagement ? await db.contractVersion.findMany({
    where: { contract: { schoolId: session.user.schoolId, archivedAt: null }, documents: { some: {} } },
    orderBy: { createdAt: "desc" },
    distinct: ["contractId"],
    select: { id: true, title: true, version: true, paymentSummary: true },
  }) : [];

  return (
    <AuthenticatedPanelShell session={session} active="contracts">
      <header className="stage4-heading">
        <div>
          <span className="section-kicker">Dokumenty rodziców</span>
          <h1>{isManagement ? "Umowy bez papierowego chaosu" : "Dokumenty do sprawdzenia"}</h1>
          <p>
            {isManagement
              ? "Każda wysłana wersja ma własny plik, skrót i historię akceptacji."
              : "Najpierw otwórz PDF. Potem świadomie zaakceptuj dokładnie tę wersję."}
          </p>
        </div>
        <div className="contract-heading-actions">
          <Link className="contract-help-link" href="/panel/umowy/pomoc">
            <CircleHelp aria-hidden="true" /> Jak to działa prawnie?
          </Link>
          <span className="role-security-chip"><ShieldCheck aria-hidden="true" /> Niezmienna wersja PDF</span>
        </div>
      </header>

      {isManagement ? (
        <ContractCreateForm
          packages={reusablePackages}
          parents={parents.map((parent) => ({
            id: parent.id,
            name: parent.name,
            status: parent.status,
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
                !["ACCEPTED", "SIGNED_PENDING_REVIEW"].includes(assignment.status),
              );
              return {
                id: assignment.id,
                contractId: assignment.contractId,
                title: assignment.version.title,
                status: expired ? "EXPIRED" : assignment.status,
                version: assignment.version.version,
                sha256: assignment.version.sha256,
                fileName: assignment.version.storedFile.originalName,
                sizeLabel: assignment.version.storedFile.sizeBytes < 1024
                  ? "mniej niż 1 KB"
                  : `${(assignment.version.storedFile.sizeBytes / 1024).toFixed(0)} KB`,
                parentName: assignment.parent.name,
                parentId: assignment.parent.id,
                studentName: assignment.student.name,
                sentAt: assignment.sentAt.toISOString(),
                viewedAt: assignment.viewedAt?.toISOString() ?? null,
                expiresAt: assignment.expiresAt?.toISOString() ?? null,
                acceptedAt: assignment.acceptance?.acceptedAt.toISOString() ?? null,
                signedUploadedAt: assignment.signedUploadedAt?.toISOString() ?? null,
                signedFile: assignment.signedFile ? { name: assignment.signedFile.originalName, sizeBytes: assignment.signedFile.sizeBytes, sha256: assignment.signedFile.sha256 } : null,
                acceptanceMode: assignment.version.acceptanceMode,
                serviceSummary: assignment.version.serviceSummary,
                requiresPayment: assignment.version.requiresPayment,
                paymentSummary: assignment.version.paymentSummary,
                paymentAmountCents: assignment.version.paymentAmountCents,
                paymentLabel: assignment.version.paymentLabel,
                paymentDueDate: assignment.version.paymentDueDate?.toISOString() ?? null,
                serviceStartDate: assignment.version.serviceStartDate?.toISOString() ?? null,
                serviceEndDate: assignment.version.serviceEndDate?.toISOString() ?? null,
                cancellationSummary: assignment.version.cancellationSummary,
                requiresEarlyStartRequest: assignment.version.requiresEarlyStartRequest,
                installmentCount: assignment.version.installmentCount,
                installmentAmountCents: assignment.version.installmentAmountCents,
                totalAmountCents: assignment.version.totalAmountCents,
                documents: assignment.version.documents.map((document) => ({
                  id: document.id, kind: document.kind, title: document.title,
                  fileName: document.storedFile.originalName,
                  sizeLabel: document.storedFile.sizeBytes < 1024 ? "mniej niż 1 KB" : `${(document.storedFile.sizeBytes / 1024).toFixed(0)} KB`,
                })),
                viewedDocumentIds: assignment.documentViews.map((view) => view.documentId),
                acceptanceStatement: getContractAcceptanceStatement({
                  title: assignment.version.title,
                  version: assignment.version.version,
                  serviceSummary: assignment.version.serviceSummary,
                  requiresPayment: assignment.version.requiresPayment,
                  paymentSummary: assignment.version.paymentSummary,
                  paymentAmountCents: assignment.version.paymentAmountCents,
                  paymentLabel: assignment.version.paymentLabel,
                  paymentDueDate: assignment.version.paymentDueDate?.toLocaleDateString("pl-PL") ?? null,
                  serviceStartDate: assignment.version.serviceStartDate?.toLocaleDateString("pl-PL") ?? null,
                  serviceEndDate: assignment.version.serviceEndDate?.toLocaleDateString("pl-PL") ?? null,
                  cancellationSummary: assignment.version.cancellationSummary,
                  requiresEarlyStartRequest: assignment.version.requiresEarlyStartRequest,
                  documentTitles: assignment.version.documents.map((document) => document.title),
                  installmentCount: assignment.version.installmentCount,
                  installmentAmountCents: assignment.version.installmentAmountCents,
                  totalAmountCents: assignment.version.totalAmountCents,
                }),
                actionLabel: getContractActionLabel(assignment.version.requiresPayment),
              };
            })}
          />
        )}
      </section>

      <p className="stage4-legal-note">
        <ShieldCheck aria-hidden="true" />
        <span>
          System zapisuje osobę, czas, treść oświadczeń, wszystkie wymagane dokumenty,
          wersję i kryptograficzny skrót pakietu. Forma dokumentowa spełnia art. 77²
          i 77³ Kodeksu cywilnego; dla podpisu odręcznego zachowujemy osobny obieg skanu.
          <Link href="/panel/umowy/pomoc"> Zobacz wymagania i konkretne podstawy prawne</Link>.
        </span>
      </p>
    </AuthenticatedPanelShell>
  );
}
