import {
  Activity,
  Database,
  Download,
  FileDown,
  FileSpreadsheet,
  Globe2,
  HardDrive,
  Image,
  LayoutTemplate,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { ImportWizard } from "@/modules/imports/components/import-wizard";

export const metadata: Metadata = { title: "Narzędzia" };
export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const session = await requireDirector("/panel/szkola/narzedzia");
  const [recentImports, recordCounts] = await Promise.all([
    db.importBatch.findMany({
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
    }),
    Promise.all([
      db.user.count({
        where: {
          schoolId: session.user.schoolId,
          archivedAt: null,
        },
      }),
      db.courseGroup.count({
        where: {
          schoolId: session.user.schoolId,
          archivedAt: null,
        },
      }),
      db.room.count({
        where: {
          schoolId: session.user.schoolId,
          archivedAt: null,
        },
      }),
    ]),
  ]);

  return (
    <AuthenticatedPanelShell session={session} active="tools">
      <header className="role-panel-heading transfers-page-heading">
        <div>
          <span className="section-kicker">Ustawienia szkoły</span>
          <h1>Narzędzia</h1>
          <p>
            Importuj dane, sprawdź bazę i edytuj publiczną stronę bez szukania
            ustawień w kilku miejscach.
          </p>
        </div>
        <span className="role-security-chip">
          <ShieldCheck aria-hidden="true" />
          Tylko dyrektor
        </span>
      </header>

      <section className="tools-hub-grid" aria-label="Narzędzia dyrektora">
        <article>
          <span className="record-icon record-icon-blue">
            <FileSpreadsheet aria-hidden="true" />
          </span>
          <div>
            <span className="section-kicker">Dane szkoły</span>
            <h2>Import i eksport</h2>
            <p>Arkusze, kopia robocza i historia operacji na kartotekach.</p>
          </div>
          <a className="button button-secondary" href="#dane">
            Przejdź do danych
          </a>
        </article>
        <article>
          <span className="record-icon record-icon-yellow">
            <LayoutTemplate aria-hidden="true" />
          </span>
          <div>
            <span className="section-kicker">Strona i wygląd</span>
            <h2>Treść publicznej strony</h2>
            <p>Zmień slider, teksty, lokalizacje, kontakt i kolejność zdjęć.</p>
          </div>
          <Link
            className="button button-secondary"
            href="/panel/szkola/narzedzia/strona"
          >
            <Image aria-hidden="true" /> Edytuj stronę
          </Link>
        </article>
        <article>
          <span className="record-icon record-icon-green">
            <HardDrive aria-hidden="true" />
          </span>
          <div>
            <span className="section-kicker">Baza danych</span>
            <h2>Połączenie działa</h2>
            <p>
              {recordCounts[0]} kont · {recordCounts[1]} grup ·{" "}
              {recordCounts[2]} sal. Hasła bazy pozostają bezpiecznie na
              serwerze.
            </p>
          </div>
          <span className="tools-status">
            <Activity aria-hidden="true" /> PostgreSQL online
          </span>
        </article>
        <article>
          <span className="record-icon record-icon-blue">
            <Globe2 aria-hidden="true" />
          </span>
          <div>
            <span className="section-kicker">Publikacja</span>
            <h2>Domena i wersja</h2>
            <p>
              Główna domena to kingslanguageacademy.pl. Wdrożenie pełnej
              aplikacji wymaga Node.js i PostgreSQL.
            </p>
          </div>
          <Link className="button button-secondary" href="/" target="_blank">
            Zobacz stronę
          </Link>
        </article>
      </section>

      <section
        className="transfer-choice-grid tools-data-section"
        id="dane"
        aria-label="Operacje na danych"
      >
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
            href="/panel/szkola/narzedzia/eksport"
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

      <div id="import">
        <ImportWizard />
      </div>

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
