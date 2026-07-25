import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";

import { requirePanelAccess } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";

export const metadata: Metadata = { title: "Panel rodzica" };
export const dynamic = "force-dynamic";

export default async function ParentPanelPage() {
  const session = await requirePanelAccess(
    "view:parent-dashboard",
    "/panel/rodzic",
  );
  const firstName = session.user.name.trim().split(/\s+/)[0] || "Rodzicu";

  return (
    <AuthenticatedPanelShell session={session}>
      <header className="role-panel-heading role-panel-heading-parent">
        <div>
          <span className="section-kicker">Panel rodzica</span>
          <h1>Dzień dobry, {firstName}</h1>
          <p>Plan, zadania i informacje ze szkoły — krótko i czytelnie.</p>
        </div>
        <span className="role-security-chip">
          <ShieldCheck aria-hidden="true" />
          Tylko powiązane dzieci
        </span>
      </header>

      <section className="parent-next-card" id="plan">
        <div className="parent-next-icon">
          <CalendarDays aria-hidden="true" />
        </div>
        <div>
          <span className="section-kicker">Najbliższe zajęcia</span>
          <h2>Plan pojawi się po przypisaniu dziecka</h2>
          <p>
            Szkoła doda powiązanie w Etapie 2. Nie musisz niczego uzupełniać
            samodzielnie.
          </p>
        </div>
        <span className="stage-one-badge">
          <Clock3 aria-hidden="true" /> Czeka na dane szkoły
        </span>
      </section>

      <div className="parent-module-grid">
        <article id="wiadomosci">
          <Bell aria-hidden="true" />
          <span className="module-status module-status-empty">0 nowych</span>
          <h2>Wiadomości</h2>
          <p>Ogłoszenia od szkoły i wykładowcy pojawią się tutaj.</p>
        </article>
        <article>
          <BookOpenCheck aria-hidden="true" />
          <span className="module-status module-status-empty">0 zadań</span>
          <h2>Materiały i zadania</h2>
          <p>Wszystko dla dziecka w jednym, prostym widoku.</p>
        </article>
        <article>
          <CreditCard aria-hidden="true" />
          <span className="module-status module-status-ready">
            <CheckCircle2 aria-hidden="true" /> Gotowe w planie
          </span>
          <h2>Status płatności</h2>
          <p>Bez płatności online — szkoła oznaczy status ręcznie.</p>
        </article>
      </div>
    </AuthenticatedPanelShell>
  );
}
