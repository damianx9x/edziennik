import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";

import { requirePanelAccess } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";

export const metadata: Metadata = { title: "Panel ucznia" };
export const dynamic = "force-dynamic";

export default async function StudentPanelPage() {
  const session = await requirePanelAccess(
    "view:student-dashboard",
    "/panel/uczen",
  );
  const firstName = session.user.name.trim().split(/\s+/)[0] || "Uczniu";

  return (
    <AuthenticatedPanelShell session={session}>
      <header className="role-panel-heading role-panel-heading-student">
        <div>
          <span className="section-kicker">Panel ucznia</span>
          <h1>Hi, {firstName}!</h1>
          <p>Tu szybko sprawdzisz, co jest dziś i co warto powtórzyć.</p>
        </div>
        <span className="student-motivation">
          <Sparkles aria-hidden="true" /> Small steps, big progress
        </span>
      </header>

      <section className="student-lesson-card" id="plan">
        <div className="student-lesson-date">
          <CalendarDays aria-hidden="true" />
          <span>
            <strong>Najbliższa lekcja</strong>
            <small>Po przypisaniu grupy</small>
          </span>
        </div>
        <div className="student-empty-lesson">
          <Clock3 aria-hidden="true" />
          <p>
            Plan pojawi się tutaj automatycznie. Nie trzeba niczego wpisywać.
          </p>
        </div>
      </section>

      <div className="student-action-grid" id="zadania">
        <article>
          <div className="student-action-icon student-action-blue">
            <BookOpen aria-hidden="true" />
          </div>
          <h2>Materiały</h2>
          <p>Notatki i pliki od wykładowcy zawsze pod ręką.</p>
          <span>W przygotowaniu · Etap 6</span>
        </article>
        <article>
          <div className="student-action-icon student-action-red">
            <GraduationCap aria-hidden="true" />
          </div>
          <h2>Zadania</h2>
          <p>Krótka lista z jasnym terminem i statusem wykonania.</p>
          <span>W przygotowaniu · Etap 6</span>
        </article>
        <article>
          <div className="student-action-icon student-action-gold">
            <Trophy aria-hidden="true" />
          </div>
          <h2>Postępy</h2>
          <p>Prosty wykres pokaże, jak rośnie Twoja pewność w angielskim.</p>
          <span>
            <CheckCircle2 aria-hidden="true" /> Zaplanowane
          </span>
        </article>
      </div>
    </AuthenticatedPanelShell>
  );
}
