import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  Eye,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { invitationRoleLabels } from "@/modules/identity/invitations/schema";

export const metadata: Metadata = { title: "Statystyki" };
export const dynamic = "force-dynamic";

const pageLabels: Record<string, string> = {
  "/": "Strona główna",
  "/panel/szkola": "Command Center",
  "/panel/szkola/kartoteki": "Kartoteki",
  "/panel/szkola/zaproszenia": "Zaproszenia",
  "/panel/szkola/narzedzia": "Ustawienia",
  "/panel/szkola/narzedzia/strona": "Edycja strony",
  "/panel/plan": "Grafik",
  "/panel/rodzic": "Panel rodzica",
  "/panel/uczen": "Panel ucznia",
};

export default async function StatisticsPage() {
  const session = await requireDirector("/panel/szkola/statystyki");
  const schoolId = session.user.schoolId;
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const activeSince = new Date(now.getTime() - 15 * 60_000);

  await db.pageVisit.deleteMany({
    where: {
      schoolId,
      visitedAt: { lt: new Date(now.getTime() - 90 * 86_400_000) },
    },
  });

  const [
    today,
    lastSevenDays,
    lastThirtyDays,
    activeNow,
    recentVisits,
    pageGroups,
    userGroups,
    openReports,
    failedImports,
  ] = await Promise.all([
    db.pageVisit.count({ where: { schoolId, visitedAt: { gte: dayStart } } }),
    db.pageVisit.count({ where: { schoolId, visitedAt: { gte: sevenDaysAgo } } }),
    db.pageVisit.count({ where: { schoolId, visitedAt: { gte: thirtyDaysAgo } } }),
    db.pageVisit.count({ where: { schoolId, visitedAt: { gte: activeSince } } }),
    db.pageVisit.findMany({
      where: { schoolId },
      orderBy: { visitedAt: "desc" },
      take: 30,
      select: {
        id: true,
        path: true,
        visitedAt: true,
        user: { select: { name: true, role: true } },
      },
    }),
    db.pageVisit.groupBy({
      by: ["path"],
      where: { schoolId, visitedAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
      take: 8,
    }),
    db.pageVisit.groupBy({
      by: ["userId"],
      where: {
        schoolId,
        visitedAt: { gte: thirtyDaysAgo },
        userId: { not: null },
      },
      _count: { _all: true },
    }),
    db.feedbackReport.count({
      where: { schoolId, status: { in: ["NEW", "TRIAGED", "IN_PROGRESS"] } },
    }),
    db.importBatch.count({ where: { schoolId, status: "FAILED" } }),
  ]);

  const userIds = userGroups.flatMap((item) =>
    item.userId ? [item.userId] : [],
  );
  const usersById = new Map(
    (
      await db.user.findMany({
        where: { id: { in: userIds }, schoolId },
        select: { id: true, name: true, role: true },
      })
    ).map((user) => [user.id, user]),
  );
  const topUsers = userGroups
    .flatMap((group) => {
      const user = group.userId ? usersById.get(group.userId) : null;
      return user ? [{ ...user, visits: group._count._all }] : [];
    })
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 8);
  const maxPageCount = Math.max(1, ...pageGroups.map((item) => item._count._all));

  return (
    <AuthenticatedPanelShell session={session} active="statistics">
      <header className="role-panel-heading">
        <div>
          <span className="section-kicker">Obraz działania szkoły</span>
          <h1>Statystyki</h1>
          <p>
            Widzisz ruch, najczęściej używane miejsca i stan systemu bez
            zapisywania adresów IP ani danych urządzeń.
          </p>
        </div>
        <span className="role-security-chip">
          <CheckCircle2 aria-hidden="true" /> Dane działają
        </span>
      </header>

      <section className="statistics-metrics" aria-label="Najważniejsze liczby">
        <Stat icon={<Eye />} label="Odsłony dzisiaj" value={today} />
        <Stat icon={<BarChart3 />} label="Ostatnie 7 dni" value={lastSevenDays} />
        <Stat icon={<Activity />} label="Ostatnie 30 dni" value={lastThirtyDays} />
        <Stat icon={<Clock3 />} label="Aktywność w 15 min" value={activeNow} />
      </section>

      <div className="statistics-grid">
        <section className="statistics-card">
          <header>
            <div>
              <span className="section-kicker">Gdzie zaglądają</span>
              <h2>Najczęściej używane miejsca</h2>
            </div>
          </header>
          <div className="statistics-bars">
            {pageGroups.map((item) => (
              <div key={item.path}>
                <span>
                  <strong>{pageLabel(item.path)}</strong>
                  <small>{item._count._all} odsłon</small>
                </span>
                <i
                  style={{ width: `${(item._count._all / maxPageCount) * 100}%` }}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="statistics-card">
          <header>
            <div>
              <span className="section-kicker">Kto korzysta</span>
              <h2>Najaktywniejsze konta</h2>
            </div>
            <Users aria-hidden="true" />
          </header>
          <ul className="statistics-users">
            {topUsers.map((user) => (
              <li key={user.id}>
                <span><strong>{user.name}</strong><small>{roleLabel(user.role)}</small></span>
                <b>{user.visits}</b>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="statistics-card statistics-diagnostics">
        <header>
          <div>
            <span className="section-kicker">Diagnostyka</span>
            <h2>Stan systemu</h2>
          </div>
        </header>
        <div>
          <Diagnostic label="Baza danych" value="Połączona" ok />
          <Diagnostic label="Otwarte zgłoszenia" value={String(openReports)} ok={openReports === 0} />
          <Diagnostic label="Nieudane importy" value={String(failedImports)} ok={failedImports === 0} />
          <Diagnostic label="Retencja statystyk" value="90 dni" ok />
        </div>
      </section>

      <section className="statistics-card">
        <header>
          <div>
            <span className="section-kicker">Ostatnia aktywność</span>
            <h2>Kto, kiedy i gdzie</h2>
          </div>
        </header>
        <div className="statistics-table-wrap">
          <table className="statistics-table">
            <thead><tr><th>Osoba</th><th>Miejsce</th><th>Czas</th></tr></thead>
            <tbody>
              {recentVisits.map((visit) => (
                <tr key={visit.id}>
                  <td><strong>{visit.user?.name ?? "Gość strony"}</strong><small>{visit.user ? roleLabel(visit.user.role) : "Anonimowa odsłona"}</small></td>
                  <td>{pageLabel(visit.path)}</td>
                  <td>{formatDate(visit.visitedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AuthenticatedPanelShell>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <article>{icon}<span><strong>{value}</strong><small>{label}</small></span></article>;
}
function Diagnostic({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <article className={ok ? "ok" : "attention"}><span><i />{label}</span><strong>{value}</strong></article>;
}
function pageLabel(path: string) {
  return pageLabels[path] ?? (path.startsWith("/panel") ? "Inny ekran panelu" : "Strona publiczna");
}
function roleLabel(role: string) {
  return invitationRoleLabels[role as keyof typeof invitationRoleLabels] ?? role;
}
function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(date);
}
