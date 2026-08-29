import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Database,
  Download,
  FileWarning,
  Gauge,
  HardDrive,
  ListChecks,
  Mail,
  ScrollText,
  Settings2,
  ShieldCheck,
  Users,
  UserPlus,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/server/db";
import { requireSystemOwner } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import {
  buildConfigurationChecks,
  sanitizeDiagnosticValue,
} from "@/modules/system-owner/diagnostics";
import { RaspberryStatusOverview } from "@/modules/system-owner/components/raspberry-control-panel";
import { SecurityTrafficOverview } from "@/modules/system-owner/components/security-traffic-overview";
import { getRaspberryStatus } from "@/modules/system-owner/server-control";
import { summarizeProtectedActivity } from "@/modules/system-owner/security-traffic";

export const metadata: Metadata = { title: "Centrum właściciela systemu" };
export const dynamic = "force-dynamic";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(value);
}

export default async function SystemOwnerPage() {
  const session = await requireSystemOwner("/panel/bog");
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const release =
    process.env.NEXT_PUBLIC_APP_RELEASE ?? "wydanie bez identyfikatora";

  const [
    schoolCount,
    activeUserCount,
    activeSessionCount,
    protectedAccountCount,
    auditTodayCount,
    pendingChangeCount,
    failedImportCount,
    openFeedbackCount,
    recentLogs,
    raspberryStatus,
    rateLimitRows,
    trafficRows,
    challengeAccountCount,
  ] = await Promise.all([
    db.school.count(),
    db.user.count({ where: { status: "ACTIVE", archivedAt: null } }),
    db.session.count({ where: { expiresAt: { gt: now } } }),
    db.user.count({ where: { twoFactorEnabled: true } }),
    db.auditLog.count({ where: { createdAt: { gte: today } } }),
    db.recordChangeRequest.count({ where: { status: "PENDING" } }),
    db.importBatch.count({ where: { status: "FAILED", archivedAt: null } }),
    db.feedbackReport.count({
      where: { status: { in: ["NEW", "TRIAGED", "IN_PROGRESS"] } },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        actor: { select: { name: true, role: true } },
        school: { select: { name: true } },
      },
    }),
    getRaspberryStatus(),
    db.rateLimit.findMany({ orderBy: { lastRequest: "desc" }, take: 200 }),
    db.pageVisit.findMany({
      where: { schoolId: session.user.schoolId, visitedAt: { gte: thirtyDaysAgo } },
      select: { countryCode: true, regionCode: true, regionName: true, deviceFamily: true, browserFamily: true },
      take: 10_000,
    }),
    db.user.count({
      where: { name: { equals: "zadanie_wykonane", mode: "insensitive" }, archivedAt: null },
    }),
  ]);

  const protectedActivity = summarizeProtectedActivity(
    rateLimitRows.filter((row) => Number(row.lastRequest) >= dayAgo.getTime()),
    process.env.KLA_ANALYTICS_SALT ?? process.env.BETTER_AUTH_SECRET ?? release,
  );
  const regionNames = new Map([
    ["mazowieckie", "MZ"], ["małopolskie", "MP"], ["śląskie", "SL"], ["wielkopolskie", "WP"],
    ["dolnośląskie", "DS"], ["pomorskie", "PM"], ["łódzkie", "LD"], ["lubelskie", "LU"],
    ["podkarpackie", "PK"], ["podlaskie", "PD"], ["opolskie", "OP"], ["lubuskie", "LB"],
    ["świętokrzyskie", "SK"], ["kujawsko-pomorskie", "KP"], ["warmińsko-mazurskie", "WM"], ["zachodniopomorskie", "ZP"],
  ]);
  const regionCounts = new Map<string, { name: string; visits: number }>();
  const deviceCounts = new Map<string, number>();
  for (const visit of trafficRows) {
    const code = visit.regionCode?.toUpperCase().replace(/^PL-/, "") ?? (visit.regionName ? regionNames.get(visit.regionName.toLocaleLowerCase("pl")) : undefined);
    if (visit.countryCode === "PL" && code) {
      const current = regionCounts.get(code);
      regionCounts.set(code, { name: visit.regionName ?? code, visits: (current?.visits ?? 0) + 1 });
    }
    const device = `${visit.deviceFamily ?? "Nieznane"} · ${visit.browserFamily ?? "Inna"}`;
    deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + 1);
  }
  const regionActivity = [...regionCounts].map(([code, value]) => ({ code, ...value })).sort((a, b) => b.visits - a.visits);
  const deviceActivity = [...deviceCounts].map(([label, visits]) => ({ label, visits })).sort((a, b) => b.visits - a.visits).slice(0, 8);

  const configurationChecks = buildConfigurationChecks(process.env);
  const problemCount = configurationChecks.filter(
    (check) => check.status !== "ok",
  ).length;
  return (
    <AuthenticatedPanelShell session={session}>
      <header className="role-panel-heading owner-heading">
        <div>
          <span className="section-kicker">Dostęp najwyższego poziomu</span>
          <h1>Centrum systemu</h1>
          <p>
            Stan aplikacji, głębokie logi i narzędzia naprawcze bez ujawniania
            sekretów ani prywatnych treści.
          </p>
        </div>
        <div className="owner-heading-actions">
          <Link className="button button-secondary" href="/panel/bog/ustawienia#email-delivery">
            <Mail aria-hidden="true" /> Ustaw wysyłkę
          </Link>
          <Link className="button button-secondary" href="/panel/bog/ustawienia#backup-usb">
            <HardDrive aria-hidden="true" /> Ustaw backup
          </Link>
          <Link className="button button-secondary" href="/panel/bog/ustawienia#full-export">
            <Database aria-hidden="true" /> Eksportuj bazę
          </Link>
          <Link className="button button-secondary" href="/panel/bog/logi">
            <ScrollText aria-hidden="true" /> Otwórz logi
          </Link>
          <a
            className="button button-primary"
            href="/panel/bog/raport"
            download
          >
            <Download aria-hidden="true" /> Pobierz raport
          </a>
        </div>
      </header>

      <section className="owner-status-banner">
        <span className="owner-status-icon">
          <ShieldCheck aria-hidden="true" />
        </span>
        <div>
          <span>Chronione konto systemowe</span>
          <strong>MFA obowiązkowe · sesje i działania audytowane</strong>
        </div>
        <small>{release}</small>
      </section>

      <SecurityTrafficOverview
        protectedActivity={protectedActivity}
        regionActivity={regionActivity}
        deviceActivity={deviceActivity}
        polandVisits={trafficRows.filter((visit) => visit.countryCode === "PL").length}
        foreignVisits={trafficRows.filter((visit) => visit.countryCode && visit.countryCode !== "PL").length}
        challengeAccountFound={challengeAccountCount > 0}
      />

      {activeUserCount === 1 ? (
        <section className="owner-first-step">
          <span className="owner-status-icon"><UserPlus aria-hidden="true" /></span>
          <div>
            <span className="section-kicker">Instalacja jest czysta</span>
            <h2>Zaproś pierwszą osobę</h2>
            <p>
              Wybierz dyrektora, wykładowcę, rodzica albo ucznia. Każde konto
              otrzyma własne uprawnienia i bezpieczny link startowy.
            </p>
          </div>
          <Link className="button button-primary" href="/panel/szkola/zaproszenia">
            Otwórz zaproszenia <UserPlus aria-hidden="true" />
          </Link>
        </section>
      ) : null}

      <section className="owner-metric-grid" aria-label="Stan systemu">
        <article>
          <Database aria-hidden="true" />
          <span>Baza danych</span>
          <strong>Połączona</strong>
          <small>{schoolCount} aktywnych instancji szkoły</small>
        </article>
        <article>
          <Users aria-hidden="true" />
          <span>Aktywne konta</span>
          <strong>{activeUserCount}</strong>
          <small>{activeSessionCount} aktywnych sesji</small>
        </article>
        <article>
          <ShieldCheck aria-hidden="true" />
          <span>Konta z MFA</span>
          <strong>{protectedAccountCount}</strong>
          <small>Konto obsługi technicznej zawsze wymaga MFA</small>
        </article>
        <article>
          <Activity aria-hidden="true" />
          <span>Działania dzisiaj</span>
          <strong>{auditTodayCount}</strong>
          <small>Bez treści wiadomości i sekretów</small>
        </article>
        <article className={pendingChangeCount ? "is-warning" : undefined}>
          <ListChecks aria-hidden="true" />
          <span>Zmiany do decyzji</span>
          <strong>{pendingChangeCount}</strong>
          <small>Oczekujące propozycje wykładowców</small>
        </article>
        <article
          className={
            failedImportCount + openFeedbackCount ? "is-warning" : undefined
          }
        >
          <FileWarning aria-hidden="true" />
          <span>Do sprawdzenia</span>
          <strong>{failedImportCount + openFeedbackCount}</strong>
          <small>
            {failedImportCount} importów · {openFeedbackCount} zgłoszeń
          </small>
        </article>
      </section>

      <RaspberryStatusOverview status={raspberryStatus} />

      <div className="owner-dashboard-grid">
        <section className="owner-panel-card">
          <header>
            <div>
              <span className="section-kicker">Automatyczny przegląd</span>
              <h2>Konfiguracja usług</h2>
            </div>
            <span
              className={
                problemCount ? "owner-review-count is-warning" : "owner-review-count"
              }
            >
              {problemCount ? `${problemCount} uwag` : "Gotowe"}
            </span>
          </header>
          <ul className="owner-check-list">
            {configurationChecks.map((check) => (
              <li key={check.key}>
                <span className={`owner-check-icon is-${check.status}`}>
                  {check.status === "ok" ? (
                    <CheckCircle2 aria-hidden="true" />
                  ) : check.status === "error" ? (
                    <CircleAlert aria-hidden="true" />
                  ) : (
                    <AlertTriangle aria-hidden="true" />
                  )}
                </span>
                <span>
                  <strong>{check.label}</strong>
                  <small>{check.detail}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="owner-panel-card">
          <header>
            <div>
              <span className="section-kicker">Troubleshooting</span>
              <h2>Szybkie narzędzia</h2>
            </div>
            <Wrench aria-hidden="true" />
          </header>
          <div className="owner-tool-grid">
            <Link href="/panel/bog/logi">
              <ScrollText aria-hidden="true" />
              <span>
                <strong>Przeszukaj logi</strong>
                <small>Akcje, encje i błędy operacji</small>
              </span>
            </Link>
            <a href="/panel/bog/raport" download>
              <Gauge aria-hidden="true" />
              <span>
                <strong>Raport techniczny</strong>
                <small>Bezpieczny JSON do przekazania Codex</small>
              </span>
            </a>
            <Link href="/panel/szkola/narzedzia">
              <Settings2 aria-hidden="true" />
              <span>
                <strong>Narzędzia szkoły</strong>
                <small>Importy, eksporty i ustawienia</small>
              </span>
            </Link>
            <Link href="/panel/szkola/powiadomienia">
              <ListChecks aria-hidden="true" />
              <span>
                <strong>Kolejka decyzji</strong>
                <small>Zmiany oczekujące na zatwierdzenie</small>
              </span>
            </Link>
            <Link href="/panel/szkola/kartoteki">
              <HardDrive aria-hidden="true" />
              <span>
                <strong>Sprawdź dane</strong>
                <small>Kartoteki osób, sal i grup</small>
              </span>
            </Link>
            <Link href="/panel/szkola">
              <Database aria-hidden="true" />
              <span>
                <strong>Wejdź jako zarządzający</strong>
                <small>Pełny widok dyrektora szkoły</small>
              </span>
            </Link>
          </div>
        </section>
      </div>

      <section className="owner-log-preview">
        <header>
          <div>
            <span className="section-kicker">Ostatnia aktywność</span>
            <h2>Log audytowy</h2>
          </div>
          <Link href="/panel/bog/logi">
            Zobacz wszystkie <ScrollText aria-hidden="true" />
          </Link>
        </header>
        <div className="owner-log-table">
          {recentLogs.map((entry) => (
            <article key={entry.id}>
              <span className="owner-log-time">{formatDate(entry.createdAt)}</span>
              <span>
                <strong>{entry.action}</strong>
                <small>
                  {entry.entityType}
                  {entry.entityId ? ` · ${entry.entityId.slice(0, 8)}` : ""}
                </small>
              </span>
              <span>
                <strong>{entry.actor?.name ?? "System"}</strong>
                <small>{entry.school.name}</small>
              </span>
              <details>
                <summary>Szczegóły</summary>
                <pre>
                  {JSON.stringify(
                    sanitizeDiagnosticValue(entry.metadata),
                    null,
                    2,
                  )}
                </pre>
              </details>
            </article>
          ))}
        </div>
      </section>
    </AuthenticatedPanelShell>
  );
}
