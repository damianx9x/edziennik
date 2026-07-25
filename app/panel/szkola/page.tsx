import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileSignature,
  MailPlus,
  MapPin,
  MessageCircleMore,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  requireActiveSession,
  requirePanelAccess,
} from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";

export const metadata: Metadata = { title: "Panel szkoły" };
export const dynamic = "force-dynamic";

export default async function SchoolPanelPage() {
  const current = await requireActiveSession("/panel/szkola");
  const session =
    current.user.role === "DIRECTOR"
      ? await requirePanelAccess(
          "view:director-dashboard",
          "/panel/szkola",
        )
      : await requirePanelAccess(
          "view:teacher-dashboard",
          "/panel/szkola",
        );

  return (
    <AuthenticatedPanelShell session={session}>
      {session.user.role === "DIRECTOR" ? (
        <DirectorDashboard name={session.user.name} />
      ) : (
        <TeacherDashboard name={session.user.name} />
      )}
    </AuthenticatedPanelShell>
  );
}

function DirectorDashboard({ name }: { name: string }) {
  const firstName = name.trim().split(/\s+/)[0] || "Dyrektorze";
  return (
    <>
      <header className="role-panel-heading">
        <div>
          <span className="section-kicker">Panel dyrektora</span>
          <h1>Dzień dobry, {firstName}</h1>
          <p>
            Dostęp jest zabezpieczony. Najważniejsze sprawy szkoły są w jednym
            miejscu.
          </p>
        </div>
        <Link
          className="button button-primary"
          href="/panel/szkola/zaproszenia"
        >
          <MailPlus aria-hidden="true" /> Zaproś osobę
        </Link>
      </header>

      <section className="stage-one-banner" aria-label="Status Etapu 1">
        <div>
          <CheckCircle2 aria-hidden="true" />
          <span>
            <strong>Etap 1 działa</strong>
            <small>Logowanie, role, zaproszenia i 2FA dyrektora</small>
          </span>
        </div>
        <span className="stage-one-badge">Bezpieczny dostęp</span>
      </section>

      <div className="director-overview">
        <article className="panel-metric panel-metric-primary">
          <span>Konta użytkowników</span>
          <strong>Zaproszenia</strong>
          <p>Dodawaj wykładowców, rodziców i uczniów bez publicznej rejestracji.</p>
          <Link href="/panel/szkola/zaproszenia">
            Zarządzaj dostępem <ArrowRight aria-hidden="true" />
          </Link>
        </article>
        <article className="panel-metric">
          <span>Ochrona danych</span>
          <strong>2FA aktywne</strong>
          <p>Wrażliwe funkcje dyrektora wymagają dodatkowego kodu.</p>
          <div className="metric-safe">
            <ShieldCheck aria-hidden="true" /> Konto chronione
          </div>
        </article>
        <article className="panel-metric panel-metric-muted">
          <span>Do Etapu 2</span>
          <strong>Kartoteki</strong>
          <p>Import uczniów i przypisanie rodziców pojawią się w kolejnym etapie.</p>
          <div className="metric-waiting">
            <Clock3 aria-hidden="true" /> Przygotowane w architekturze
          </div>
        </article>
      </div>

      <section className="schedule-priority-card" id="grafik">
        <div className="schedule-priority-copy">
          <span className="section-kicker">Najważniejszy moduł projektu</span>
          <h2>Grafik sala + wykładowca + grupa</h2>
          <p>
            W Etapie 3 ten ekran pozwoli układać tydzień przeciąganiem i od razu
            pokaże każdą kolizję. Fundament danych jest już gotowy.
          </p>
          <div className="schedule-resource-pills">
            <span>
              <MapPin aria-hidden="true" /> Sala
            </span>
            <span>
              <Users aria-hidden="true" /> Grupa
            </span>
            <span>
              <CalendarClock aria-hidden="true" /> Wykładowca
            </span>
          </div>
        </div>
        <div className="schedule-preview" aria-label="Podgląd przyszłego grafiku">
          <div className="schedule-preview-head">
            <span>Pon.</span>
            <span>Wt.</span>
            <span>Śr.</span>
          </div>
          <div className="schedule-preview-grid">
            <span className="lesson-block lesson-blue">
              <small>14:20</small> Toronto
            </span>
            <span className="lesson-block lesson-red">
              <small>15:45</small> Oxford
            </span>
            <span className="lesson-block lesson-gold">
              <small>17:10</small> Monaco
            </span>
          </div>
          <div className="schedule-coming">
            <AlertTriangle aria-hidden="true" />
            Automatyczne wykrywanie kolizji w Etapie 3
          </div>
        </div>
      </section>

      <section className="locked-module-row">
        <article>
          <FileSignature aria-hidden="true" />
          <span>
            <strong>Umowy online</strong>
            <small>Etap 4</small>
          </span>
        </article>
        <article>
          <MessageCircleMore aria-hidden="true" />
          <span>
            <strong>Wiadomości</strong>
            <small>Etap 5</small>
          </span>
        </article>
        <article>
          <CalendarClock aria-hidden="true" />
          <span>
            <strong>Status płatności</strong>
            <small>Etap 4</small>
          </span>
        </article>
      </section>
    </>
  );
}

function TeacherDashboard({ name }: { name: string }) {
  const firstName = name.trim().split(/\s+/)[0] || "Wykładowco";
  return (
    <>
      <header className="role-panel-heading">
        <div>
          <span className="section-kicker">Panel wykładowcy</span>
          <h1>Dzień dobry, {firstName}</h1>
          <p>
            Widzisz tylko swoje grupy. Dane innych wykładowców pozostają
            niedostępne.
          </p>
        </div>
      </header>

      <section className="stage-one-banner">
        <div>
          <ShieldCheck aria-hidden="true" />
          <span>
            <strong>Uprawnienia sprawdzone</strong>
            <small>Serwer chroni każdą próbę wejścia do cudzej grupy</small>
          </span>
        </div>
      </section>

      <div className="teacher-today-grid" id="grupy">
        <section className="role-main-card">
          <span className="section-kicker">Dzisiaj</span>
          <h2>Plan pojawi się po przypisaniu grup</h2>
          <p>
            Dyrektor doda sale, grupy i wykładowców w Etapie 2. Potem zobaczysz
            tutaj tylko swoje zajęcia.
          </p>
          <div className="empty-state-action">
            <CalendarClock aria-hidden="true" />
            <span>
              <strong>Na razie nic nie musisz robić</strong>
              <small>Dostaniesz powiadomienie po przypisaniu pierwszej grupy.</small>
            </span>
          </div>
        </section>
        <aside className="role-side-card" id="wiadomosci">
          <MessageCircleMore aria-hidden="true" />
          <h2>Kontakt z grupą</h2>
          <p>Wiadomości i materiały zostaną włączone po przygotowaniu grup.</p>
          <span className="stage-one-badge">Etap 5</span>
        </aside>
      </div>
    </>
  );
}
