import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  DoorOpen,
  FileSignature,
  GraduationCap,
  MailPlus,
  MapPin,
  MessageCircleMore,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { db } from "@/lib/server/db";
import {
  requireActiveSession,
  requirePanelAccess,
} from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";

export const metadata: Metadata = { title: "Panel szkoły" };
export const dynamic = "force-dynamic";

export default async function SchoolPanelPage() {
  const current = await requireActiveSession("/panel/szkola");
  const isManagement =
    current.user.role === "SYSTEM_OWNER" ||
    current.user.role === "DIRECTOR";
  const session =
    isManagement
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
      {session.user.role === "SYSTEM_OWNER" ||
      session.user.role === "DIRECTOR" ? (
        <DirectorDashboard
          name={session.user.name}
          schoolId={session.user.schoolId}
        />
      ) : (
        <TeacherDashboard name={session.user.name} userId={session.user.id} schoolId={session.user.schoolId} />
      )}
    </AuthenticatedPanelShell>
  );
}

async function DirectorDashboard({
  name,
  schoolId,
}: {
  name: string;
  schoolId: string;
}) {
  const firstName = name.trim().split(/\s+/)[0] || "Dyrektorze";
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
  const [
    slots,
    pendingChanges,
    activeInvitations,
    openReports,
    locations,
    groups,
    rooms,
    students,
  ] = await Promise.all([
    db.scheduleSlot.findMany({
      where: {
        schoolId,
        startAt: { gte: weekStart, lt: weekEnd },
        status: { not: "CANCELLED" },
      },
      orderBy: { startAt: "asc" },
      take: 80,
      select: {
        id: true,
        startAt: true,
        endAt: true,
        group: { select: { name: true, location: { select: { name: true } } } },
        room: { select: { name: true } },
        teacher: { select: { name: true } },
      },
    }),
    db.recordChangeRequest.count({ where: { schoolId, status: "PENDING" } }),
    db.invitation.count({
      where: { schoolId, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
    }),
    db.feedbackReport.count({
      where: { schoolId, status: { in: ["NEW", "TRIAGED", "IN_PROGRESS"] } },
    }),
    db.location.count({ where: { schoolId, isActive: true, archivedAt: null } }),
    db.courseGroup.count({ where: { schoolId, archivedAt: null } }),
    db.room.count({ where: { schoolId, archivedAt: null } }),
    db.user.count({ where: { schoolId, role: "STUDENT", archivedAt: null } }),
  ]);
  const daySlots = Array.from({ length: 6 }, (_, day) =>
    slots.filter((slot) => dayIndex(slot.startAt) === day),
  );
  const matters = pendingChanges + activeInvitations + openReports;

  return (
    <>
      <header className="role-panel-heading">
        <div>
          <span className="section-kicker">Command Center szkoły</span>
          <h1>Dzień dobry, {firstName}</h1>
          <p>
            Plan całej szkoły, sprawy do decyzji i szybkie działania masz teraz
            na jednym ekranie.
          </p>
        </div>
        <Link
          className="button button-primary"
          href="/panel/szkola/zaproszenia"
        >
          <MailPlus aria-hidden="true" /> Zaproś osobę
        </Link>
      </header>

      <section className="command-status" aria-label="Stan szkoły">
        <div>
          {matters ? <BellRing aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
          <span>
            <strong>{matters ? `${matters} spraw wymaga uwagi` : "Wszystko pod kontrolą"}</strong>
            <small>Najpierw decyzje, potem codzienna organizacja.</small>
          </span>
        </div>
        <a href="#sprawy">Przejdź do spraw <ArrowRight aria-hidden="true" /></a>
      </section>

      <section className="command-schedule" id="grafik">
        <header>
          <div>
            <span className="section-kicker">Cała szkoła · ten tydzień</span>
            <h2>Grafik w jednym spojrzeniu</h2>
            <p>{slots.length} zaplanowanych lekcji. Kliknij grafik, aby edytować lub uruchomić Asystenta.</p>
          </div>
          <Link className="button button-secondary" href="/panel/plan">
            Otwórz grafik <ArrowRight aria-hidden="true" />
          </Link>
        </header>
        <div className="command-week" aria-label="Lekcje całej szkoły">
          {daySlots.map((items, index) => (
            <section key={index}>
              <h3>{["Pon.", "Wt.", "Śr.", "Czw.", "Pt.", "Sob."][index]}</h3>
              <div>
                {items.length ? items.slice(0, 4).map((slot) => (
                  <article key={slot.id}>
                    <time>{formatTime(slot.startAt)}</time>
                    <strong>{slot.group.name}</strong>
                    <small>{slot.group.location.name} · {slot.room.name}</small>
                  </article>
                )) : <span className="command-empty-day">Brak zajęć</span>}
                {items.length > 4 ? <small className="command-more">+{items.length - 4} kolejnych</small> : null}
              </div>
            </section>
          ))}
        </div>
      </section>

      <div className="command-grid">
        <section className="command-matters" id="sprawy">
          <header>
            <div>
              <span className="section-kicker">Do sprawdzenia</span>
              <h2>Sprawy wymagające decyzji</h2>
            </div>
            <strong>{matters}</strong>
          </header>
          <div>
            <CommandMatter icon={<BellRing />} label="Zmiany w kartotekach" value={pendingChanges} href="/panel/szkola/powiadomienia" />
            <CommandMatter icon={<MailPlus />} label="Aktywne zaproszenia" value={activeInvitations} href="/panel/szkola/zaproszenia" />
            <CommandMatter icon={<AlertTriangle />} label="Zgłoszenia użytkowników" value={openReports} href="/panel/szkola/statystyki" />
          </div>
        </section>

        <section className="command-school">
          <header><span className="section-kicker">Stan szkoły</span><h2>Organizacja</h2></header>
          <div>
            <span><MapPin /><strong>{locations}</strong><small>Lokalizacje</small></span>
            <span><Users /><strong>{groups}</strong><small>Grupy</small></span>
            <span><DoorOpen /><strong>{rooms}</strong><small>Sale</small></span>
            <span><GraduationCap /><strong>{students}</strong><small>Uczniowie</small></span>
          </div>
          <Link href="/panel/szkola/kartoteki">Otwórz kartoteki <ArrowRight /></Link>
        </section>
      </div>

      <section className="locked-module-row">
        <Link href="/panel/umowy" className="module-ready">
          <FileSignature aria-hidden="true" />
          <span>
            <strong>Umowy online</strong>
            <small>Otwórz moduł</small>
          </span>
        </Link>
        <Link href="/panel/wiadomosci" className="module-ready" id="wiadomosci">
          <MessageCircleMore aria-hidden="true" />
          <span>
            <strong>Wiadomości</strong>
            <small>Rozmowy i ogłoszenia</small>
          </span>
        </Link>
        <Link href="/panel/platnosci" className="module-ready" id="platnosci">
          <CalendarClock aria-hidden="true" />
          <span>
            <strong>Status płatności</strong>
            <small>Otwórz moduł</small>
          </span>
        </Link>
        <article id="postepy">
          <TrendingUp aria-hidden="true" />
          <span>
            <strong>Postępy uczniów</strong>
            <small>Etap 6</small>
          </span>
        </article>
      </section>
    </>
  );
}

function CommandMatter({ icon, label, value, href }: { icon: ReactNode; label: string; value: number; href: string }) {
  return <Link href={href}>{icon}<span><strong>{label}</strong><small>{value ? `${value} oczekuje` : "Brak nowych spraw"}</small></span><b>{value}</b><ArrowRight /></Link>;
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function dayIndex(date: Date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}
function formatTime(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(date);
}

async function TeacherDashboard({ name, userId, schoolId }: { name: string; userId: string; schoolId: string }) {
  const firstName = name.trim().split(/\s+/)[0] || "Wykładowco";
  const [groupCount, nextLesson] = await Promise.all([
    db.groupTeacher.count({ where: { teacherId: userId, archivedAt: null, group: { schoolId, archivedAt: null } } }),
    db.scheduleSlot.findFirst({ where: { schoolId, teacherId: userId, startAt: { gte: new Date() }, status: { not: "CANCELLED" }, archivedAt: null }, orderBy: { startAt: "asc" }, select: { startAt: true, group: { select: { name: true } }, room: { select: { name: true } } } }),
  ]);
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
          <h2>{nextLesson ? nextLesson.group.name : groupCount ? "Brak kolejnych zaplanowanych zajęć" : "Plan pojawi się po przypisaniu grup"}</h2>
          <p>
            {nextLesson ? `${formatDashboardDate(nextLesson.startAt)} · ${nextLesson.room.name}` : groupCount ? `Masz ${groupCount} przypisanych grup. Otwórz plan, aby zobaczyć pełny tydzień.` : "Po przypisaniu Ci grup zobaczysz tutaj wyłącznie swoje zajęcia."}
          </p>
          <div className="empty-state-action">
            <CalendarClock aria-hidden="true" />
            <span>
              <strong>{nextLesson ? "Najbliższa lekcja jest w planie" : groupCount ? "Grupy są już przypisane" : "Na razie nic nie musisz robić"}</strong>
              <small>{groupCount ? <Link href="/panel/plan">Otwórz mój plan</Link> : "Dostaniesz powiadomienie po przypisaniu pierwszej grupy."}</small>
            </span>
          </div>
        </section>
        <aside className="role-side-card" id="wiadomosci">
          <MessageCircleMore aria-hidden="true" />
          <h2>Kontakt z grupą</h2>
          <p>Napisz do przypisanej grupy lub sprawdź ogłoszenia szkoły.</p>
          <Link className="stage-one-badge" href="/panel/wiadomosci">Otwórz wiadomości</Link>
        </aside>
      </div>
    </>
  );
}

function formatDashboardDate(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(date);
}
