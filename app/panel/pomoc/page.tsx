import { BookOpenCheck, Download, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { requireActiveSession } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import {
  manualAudienceForRole,
  manualLabels,
  manualRelease,
  schoolManualAudiences,
  type SchoolManualAudience,
} from "@/modules/manuals/release";

export const metadata: Metadata = { title: "Pomoc i podręczniki" };
export const dynamic = "force-dynamic";

export default async function ManualsPage() {
  const session = await requireActiveSession("/panel/pomoc");
  const isOwner = session.user.role === "SYSTEM_OWNER";
  const ownAudience = manualAudienceForRole(session.user.role);
  const roleDescriptions: Record<SchoolManualAudience, string> = {
    director: "Codzienna organizacja szkoły, konta, kartoteki, grafik, umowy, raty, komunikacja, nauka i statystyki.",
    teacher: "Plan i dostępność, prowadzenie lekcji, obecność, wiadomości, materiały, zadania i postępy uczniów.",
    parent: "Dzieci, najbliższe zajęcia, plan, wiadomości, umowy, raty, materiały i postępy.",
    student: "Najbliższe lekcje, plan, wiadomości, materiały, zadania, obecność i własne postępy.",
  };
  const visibleAudiences: SchoolManualAudience[] = isOwner
    ? schoolManualAudiences
    : ownAudience === "owner" ? [] : [ownAudience];

  return (
    <AuthenticatedPanelShell session={session} active="help">
      <header className="role-panel-heading manual-page-heading">
        <div>
          <span className="section-kicker">Pomoc krok po kroku</span>
          <h1>Podręczniki eDziennika</h1>
          <p>Pobierasz zawsze instrukcję zgodną z wersją uruchomioną na tym serwerze.</p>
        </div>
        <span className="role-security-chip"><BookOpenCheck aria-hidden="true" /> Wersja {manualRelease.version}</span>
      </header>

      <section className="manual-change-card" aria-labelledby="manual-changes-title">
        <div><span className="section-kicker">Najnowsze wydanie · {manualRelease.date}</span><h2 id="manual-changes-title">Co zmieniło się od poprzedniej wersji</h2></div>
        <ul>{manualRelease.schoolChanges.map((change) => <li key={change}>{change}</li>)}</ul>
      </section>

      <section className="manual-download-grid" aria-label="Podręczniki do pobrania">
        {visibleAudiences.map((audience) => <article key={audience}>
          <BookOpenCheck aria-hidden="true" />
          <div><span className="section-kicker">Instrukcja dopasowana do roli</span><h2>{manualLabels[audience]}</h2><p>{roleDescriptions[audience]}</p><small>Każda funkcja ma osobną stronę ze zdjęciem, dokładną ścieżką, oczekiwanym wynikiem i typowymi problemami.</small></div>
          <a className="button button-primary" href={isOwner ? `/panel/pomoc/podrecznik/${audience}` : "/panel/pomoc/podrecznik"}><Download aria-hidden="true" /> Pobierz {manualLabels[audience].toLocaleLowerCase("pl-PL")}</a>
        </article>)}
        {isOwner ? <article>
          <ShieldCheck aria-hidden="true" />
          <div><span className="section-kicker">Tylko dla właściciela systemu</span><h2>Serwer, szyfrowanie, kopie i awarie</h2><p>Osobny przewodnik po pierwszym uruchomieniu, sekretach, Raspberry, aktualizacjach, odtwarzaniu i bezpiecznej diagnostyce.</p></div>
          <a className="button button-secondary" href="/panel/pomoc/podrecznik-wlasciciela"><Download aria-hidden="true" /> Pobierz podręcznik właściciela</a>
        </article> : null}
      </section>
    </AuthenticatedPanelShell>
  );
}
