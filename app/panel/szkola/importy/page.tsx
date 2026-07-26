import {
  Database,
  Download,
  FileDown,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";

import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { ImportWizard } from "@/modules/imports/components/import-wizard";

export const metadata: Metadata = { title: "Import i eksport" };
export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const session = await requireDirector("/panel/szkola/importy");
  const recentImports = await db.importBatch.findMany({
    where: { schoolId: session.user.schoolId, archivedAt: null },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      status: true,
      totalRows: true,
      errorRows: true,
      duplicateRows: true,
      createdAt: true,
      sourceFile: { select: { originalName: true } },
    },
  });

  return (
    <AuthenticatedPanelShell session={session} active="transfers">
      <header className="role-panel-heading transfers-page-heading">
        <div>
          <span className="section-kicker">Dane i pliki szkoły</span>
          <h1>Import i eksport</h1>
          <p>
            Tutaj przenosisz dane między arkuszem a eDziennikiem. Kartoteki
            pozostają spokojnym miejscem do codziennej pracy.
          </p>
        </div>
        <span className="role-security-chip">
          <ShieldCheck aria-hidden="true" />
          Tylko dyrektor
        </span>
      </header>

      <section className="transfer-choice-grid" aria-label="Operacje na danych">
        <article>
          <span className="record-icon record-icon-blue">
            <FileSpreadsheet aria-hidden="true" />
          </span>
          <div>
            <span className="section-kicker">Dodaj lub zaktualizuj</span>
            <h2>Import z arkusza</h2>
            <p>Najpierw bezpieczny podgląd, później osobne zatwierdzenie.</p>
          </div>
          <a className="button button-secondary" href="#import">
            Przejdź do importu
          </a>
        </article>
        <article>
          <span className="record-icon record-icon-yellow">
            <FileDown aria-hidden="true" />
          </span>
          <div>
            <span className="section-kicker">Kopia robocza</span>
            <h2>Eksport kartotek</h2>
            <p>
              Pobierz aktywne sale, grupy, osoby i relacje do pliku zgodnego z
              szablonem importu.
            </p>
          </div>
          <a
            className="button button-primary"
            href="/panel/szkola/importy/eksport"
          >
            <Download aria-hidden="true" /> Pobierz CSV
          </a>
        </article>
      </section>

      <section className="records-safety-banner transfer-safety-banner">
        <ShieldCheck aria-hidden="true" />
        <span>
          <strong>Pliki importu są prywatne</strong>
          <small>
            Nie trafiają do publicznego katalogu strony. Każdy eksport jest
            zapisywany w dzienniku audytowym.
          </small>
        </span>
      </section>

      <ImportWizard />

      <section className="records-card import-history-card">
        <div className="records-card-heading">
          <span className="record-icon record-icon-blue">
            <Database aria-hidden="true" />
          </span>
          <div>
            <h2>Historia importów</h2>
            <p>Wynik operacji bez treści arkusza i danych osobowych w logach.</p>
          </div>
          <span className="records-count">{recentImports.length}</span>
        </div>

        {recentImports.length === 0 ? (
          <div className="records-empty">
            <strong>Brak historii</strong>
            <p>Pierwszy podgląd importu pojawi się tutaj.</p>
          </div>
        ) : (
          <div className="import-history">
            {recentImports.map((item) => (
              <article key={item.id}>
                <span>
                  <strong>{item.sourceFile.originalName}</strong>
                  <small>
                    {formatDate(item.createdAt)} · {item.totalRows} wierszy
                  </small>
                </span>
                <span
                  className={`import-status status-${item.status.toLowerCase()}`}
                >
                  {importStatusLabel(item.status)}
                </span>
                <small>
                  {item.errorRows} błędów · {item.duplicateRows} duplikatów
                </small>
              </article>
            ))}
          </div>
        )}
      </section>
    </AuthenticatedPanelShell>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(date);
}

function importStatusLabel(status: string) {
  return (
    {
      PREVIEW_READY: "Podgląd",
      COMMITTED: "Zapisany",
      FAILED: "Błąd",
      ARCHIVED: "Archiwum",
    }[status] ?? status
  );
}
