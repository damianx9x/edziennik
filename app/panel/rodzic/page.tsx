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
import Link from "next/link";

import { db } from "@/lib/server/db";
import { requirePanelAccess } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { getModuleAccessPolicy, moduleIsEnabled } from "@/modules/module-access/server";

export const metadata: Metadata = { title: "Panel rodzica" };
export const dynamic = "force-dynamic";

export default async function ParentPanelPage() {
  const session = await requirePanelAccess(
    "view:parent-dashboard",
    "/panel/rodzic",
  );
  const firstName = session.user.name.trim().split(/\s+/)[0] || "Rodzicu";
  const [childrenCount, nextLesson, moduleAccess] = await Promise.all([
    db.parentChild.count({ where: { schoolId: session.user.schoolId, parentId: session.user.id, archivedAt: null } }),
    db.scheduleSlot.findFirst({
      where: { schoolId: session.user.schoolId, startAt: { gte: new Date() }, status: { not: "CANCELLED" }, group: { enrollments: { some: { status: "ACTIVE", student: { childLinks: { some: { parentId: session.user.id, archivedAt: null } } } } } } },
      orderBy: { startAt: "asc" },
      select: { startAt: true, group: { select: { name: true } }, room: { select: { name: true } } },
    }),
    getModuleAccessPolicy(session.user.schoolId),
  ]);
  const scheduleEnabled = moduleIsEnabled(moduleAccess, "schedule", "PARENT");

  return (
    <AuthenticatedPanelShell session={session}>
      <header className="role-panel-heading role-panel-heading-parent">
        <div>
          <span className="section-kicker">Panel rodzica</span>
          <h1>Dzień dobry, {firstName}</h1>
          <p>Najważniejsze informacje ze szkoły — krótko i czytelnie.</p>
        </div>
        <span className="role-security-chip">
          <ShieldCheck aria-hidden="true" />
          Tylko powiązane dzieci
        </span>
      </header>

      {scheduleEnabled ? <section className="parent-next-card" id="plan">
        <div className="parent-next-icon">
          <CalendarDays aria-hidden="true" />
        </div>
        <div>
          <span className="section-kicker">Najbliższe zajęcia</span>
          <h2>{nextLesson ? nextLesson.group.name : childrenCount ? "Brak kolejnych zaplanowanych zajęć" : "Plan pojawi się po powiązaniu dziecka"}</h2>
          <p>
            {nextLesson ? `${formatLessonDate(nextLesson.startAt)} · ${nextLesson.room.name}` : childrenCount ? "Sprawdź pełny plan — szkoła może dopiero przygotowywać kolejny tydzień." : "Dyrektor powiąże konto z dzieckiem. Nie musisz niczego uzupełniać samodzielnie."}
          </p>
        </div>
        <span className="stage-one-badge">
          <Clock3 aria-hidden="true" /> <Link href="/panel/plan">Otwórz plan</Link>
        </span>
      </section> : null}

      <div className="parent-module-grid">
        {moduleIsEnabled(moduleAccess, "messages", "PARENT") ? <article id="wiadomosci">
          <Bell aria-hidden="true" />
          <span className="module-status module-status-ready">Gotowe</span>
          <h2>Wiadomości</h2>
          <p>Ogłoszenia szkoły i rozmowy Twoich grup.</p>
          <Link href="/panel/wiadomosci">Otwórz wiadomości</Link>
        </article> : null}
        {moduleIsEnabled(moduleAccess, "learning", "PARENT") ? <article className="module-card-linked">
          <BookOpenCheck aria-hidden="true" />
          <span className="module-status module-status-empty">0 zadań</span>
          <h2>Materiały i zadania</h2>
          <p>Wszystko dla dziecka w jednym, prostym widoku.</p>
          <Link href="/panel/nauka">Otwórz naukę</Link>
        </article> : null}
        {moduleIsEnabled(moduleAccess, "progress", "PARENT") ? <article className="module-card-linked">
          <CheckCircle2 aria-hidden="true" />
          <span className="module-status module-status-ready">Gotowe</span>
          <h2>Postępy dziecka</h2>
          <p>Opisowe obserwacje, obecność i kolejne małe kroki.</p>
          <Link href="/panel/postepy">Otwórz postępy</Link>
        </article> : null}
        {moduleIsEnabled(moduleAccess, "payments", "PARENT") ? <article>
          <CreditCard aria-hidden="true" />
          <span className="module-status module-status-ready">
            <CheckCircle2 aria-hidden="true" /> Gotowe
          </span>
          <h2>Status płatności</h2>
          <p>Bez płatności online — szkoła oznaczy status ręcznie.</p>
          <Link href="/panel/platnosci">Otwórz płatności</Link>
        </article> : null}
      </div>
    </AuthenticatedPanelShell>
  );
}

function formatLessonDate(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(date);
}
