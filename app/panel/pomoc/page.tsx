import { BookOpenCheck, Download, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { requireActiveSession } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { manualRelease } from "@/modules/manuals/release";

export const metadata: Metadata = { title: "Pomoc i podręczniki" };
export const dynamic = "force-dynamic";

export default async function ManualsPage() {
  const session = await requireActiveSession("/panel/pomoc");
  const isOwner = session.user.role === "SYSTEM_OWNER";

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
        <article>
          <BookOpenCheck aria-hidden="true" />
          <div><span className="section-kicker">Dla szkoły i rodzin</span><h2>Instrukcja dla dyrektora, wykładowcy, rodzica i ucznia</h2><p>Pokazuje ekran po ekranie: gdzie kliknąć, co się stanie, jaki wynik zobaczysz i czego dana rola nie może zmienić.</p></div>
          <a className="button button-primary" href="/panel/pomoc/podrecznik"><Download aria-hidden="true" /> Pobierz aktualny PDF</a>
        </article>
        {isOwner ? <article>
          <ShieldCheck aria-hidden="true" />
          <div><span className="section-kicker">Tylko dla właściciela systemu</span><h2>Serwer, szyfrowanie, kopie i awarie</h2><p>Osobny przewodnik po pierwszym uruchomieniu, sekretach, Raspberry, aktualizacjach, odtwarzaniu i bezpiecznej diagnostyce.</p></div>
          <a className="button button-secondary" href="/panel/pomoc/podrecznik-wlasciciela"><Download aria-hidden="true" /> Pobierz podręcznik właściciela</a>
        </article> : null}
      </section>
    </AuthenticatedPanelShell>
  );
}
