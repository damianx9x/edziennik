import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/lib/server/db";
import { ContractAcceptForm } from "@/modules/contracts/components/contract-accept-form";
import { ContractCreateForm } from "@/modules/contracts/components/contract-create-form";
import { ContractVersionForm } from "@/modules/contracts/components/contract-version-form";
import { requireActiveSession, requireDirector } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";

export const metadata: Metadata = { title: "Umowy online" };
export const dynamic = "force-dynamic";

const statusLabels = {
  DRAFT: "Szkic",
  SENT: "Wysłana",
  VIEWED: "Otwarta",
  ACCEPTED: "Zaakceptowana",
  EXPIRED: "Wygasła",
} as const;

export default async function ContractsPage() {
  const session = await requireActiveSession("/panel/umowy");
  if (!['SYSTEM_OWNER', 'DIRECTOR', 'PARENT'].includes(session.user.role)) {
    redirect("/panel/brak-dostepu");
  }

  const isManagement = session.user.role === "SYSTEM_OWNER" || session.user.role === "DIRECTOR";
  if (isManagement) await requireDirector("/panel/umowy");
  const assignments = await db.contractAssignment.findMany({
    where: {
      schoolId: session.user.schoolId,
      ...(isManagement ? {} : { parentId: session.user.id }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      contract: { select: { title: true } },
      version: {
        select: {
          version: true,
          sha256: true,
          storedFile: { select: { originalName: true, sizeBytes: true } },
        },
      },
      parent: { select: { name: true } },
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
        {assignments.length === 0 ? (
          <div className="stage4-empty">
            <FileText aria-hidden="true" />
            <h3>Nie ma jeszcze żadnej umowy</h3>
            <p>{isManagement ? "Użyj formularza powyżej, aby wysłać pierwszą wersję." : "Szkoła powiadomi Cię, gdy dokument będzie gotowy."}</p>
          </div>
        ) : (
          <div className="stage4-card-list">
            {assignments.map((assignment) => {
              const expired = assignment.expiresAt && assignment.expiresAt < new Date() && assignment.status !== "ACCEPTED";
              const status = expired ? "EXPIRED" : assignment.status;
              return (
                <article className="contract-card" key={assignment.id}>
                  <div className="contract-card-main">
                    <span className="stage4-icon"><FileCheck2 aria-hidden="true" /></span>
                    <div>
                      <span className={`stage4-status status-${status.toLowerCase()}`}>{statusLabels[status]}</span>
                      <h3>{assignment.contract.title}</h3>
                      <p>
                        Wersja {assignment.version.version} · {assignment.student.name}
                        {isManagement ? ` · rodzic: ${assignment.parent.name}` : ""}
                      </p>
                      <small>SHA-256: {assignment.version.sha256.slice(0, 12)}… · {(assignment.version.storedFile.sizeBytes / 1024).toFixed(0)} KB</small>
                    </div>
                  </div>
                  <div className="contract-card-actions">
                    <Link className="stage4-secondary" href={`/panel/umowy/${assignment.id}/plik`} target="_blank">
                      Otwórz PDF <ExternalLink aria-hidden="true" />
                    </Link>
                    {!isManagement && !expired && assignment.status !== "ACCEPTED" ? (
                      <ContractAcceptForm assignmentId={assignment.id} />
                    ) : assignment.status === "ACCEPTED" ? (
                      <span className="contract-accepted-note"><CheckCircle2 aria-hidden="true" /> Zapisano {assignment.acceptance?.acceptedAt.toLocaleDateString("pl-PL")}</span>
                    ) : expired ? (
                      <span className="contract-expired-note"><Clock3 aria-hidden="true" /> Poproś szkołę o nową wersję</span>
                    ) : null}
                    {isManagement ? (
                      <ContractVersionForm contractId={assignment.contractId} assignmentId={assignment.id} />
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="stage4-legal-note">
        To prosta akceptacja dokumentu w eDzienniku, nie kwalifikowany podpis elektroniczny. Treść umowy i komunikatu akceptacji wymaga zatwierdzenia przez prawnika przed użyciem z prawdziwymi danymi.
      </p>
    </AuthenticatedPanelShell>
  );
}
