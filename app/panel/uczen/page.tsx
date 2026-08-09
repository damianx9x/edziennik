import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  MessageCircleMore,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/server/db";
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
  const [groupCount, nextLesson] = await Promise.all([
    db.enrollment.count({ where: { studentId: session.user.id, status: "ACTIVE", group: { schoolId: session.user.schoolId, archivedAt: null } } }),
    db.scheduleSlot.findFirst({ where: { schoolId: session.user.schoolId, startAt: { gte: new Date() }, status: { not: "CANCELLED" }, group: { enrollments: { some: { studentId: session.user.id, status: "ACTIVE" } } } }, orderBy: { startAt: "asc" }, select: { startAt: true, group: { select: { name: true } }, room: { select: { name: true } } } }),
  ]);

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
            <small>{nextLesson ? formatLessonDate(nextLesson.startAt) : groupCount ? "Szkoła przygotowuje kolejny termin" : "Po przypisaniu grupy"}</small>
          </span>
        </div>
        <div className="student-empty-lesson">
          <Clock3 aria-hidden="true" />
          <p>{nextLesson ? `${nextLesson.group.name} · ${nextLesson.room.name}` : groupCount ? "Nie ma teraz kolejnych zaplanowanych lekcji. Otwórz plan, aby sprawdzić wcześniejsze zajęcia." : "Plan pojawi się tutaj automatycznie. Nie trzeba niczego wpisywać."}</p>
          <Link href="/panel/plan">Otwórz pełny plan</Link>
        </div>
      </section>

      <div className="student-action-grid" id="zadania">
        <article>
          <div className="student-action-icon student-action-blue">
            <MessageCircleMore aria-hidden="true" />
          </div>
          <h2>Wiadomości grupy</h2>
          <p>Informacje od szkoły i wykładowcy w jednym miejscu.</p>
          <Link href="/panel/wiadomosci">Otwórz rozmowę</Link>
        </article>
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

function formatLessonDate(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(date);
}
