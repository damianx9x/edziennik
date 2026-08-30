import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  MapPinned,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/server/db";
import { requireSystemOwner } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import {
  getAuditActionLabel,
  getAuditEventTone,
  getAuditModule,
} from "@/modules/system-owner/audit-presentation";
import { sanitizeDiagnosticValue } from "@/modules/system-owner/diagnostics";
import {
  ownerEventRoles,
  safeEventRole,
  safeEventSchool,
} from "@/modules/system-owner/event-query";

export const metadata: Metadata = { title: "Centrum zdarzeń systemu" };
export const dynamic = "force-dynamic";

const pageSize = 60;
const moduleOptions = [
  ["identity", "Konta i dostęp"],
  ["records", "Kartoteki"],
  ["schedule", "Grafik i lekcje"],
  ["contracts", "Umowy"],
  ["payments", "Płatności"],
  ["messages", "Wiadomości"],
  ["announcements", "Ogłoszenia"],
  ["learning", "Materiały i zadania"],
  ["progress", "Postępy ucznia"],
  ["imports", "Import i eksport"],
  ["system", "Serwer i konfiguracja"],
  ["site", "Strona szkoły"],
] as const;

type LogSearchParams = {
  q?: string;
  school?: string;
  kind?: string;
  module?: string;
  role?: string;
  period?: string;
  page?: string;
};
type AuditEventRow = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  ipAddressHash: string | null;
  createdAt: Date;
  actor: { name: string; role: string } | null;
  school: { name: string };
};
type VisitEventRow = {
  id: string;
  path: string;
  countryCode: string | null;
  regionCode: string | null;
  regionName: string | null;
  clientHash: string | null;
  deviceFamily: string | null;
  browserFamily: string | null;
  visitedAt: Date;
  user: { name: string; role: string } | null;
  school: { name: string } | null;
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Warsaw",
  }).format(value);
}

function startDate(period: string) {
  const now = Date.now();
  if (period === "24h") return new Date(now - 86_400_000);
  if (period === "7d") return new Date(now - 7 * 86_400_000);
  if (period === "30d") return new Date(now - 30 * 86_400_000);
  if (period === "90d") return new Date(now - 90 * 86_400_000);
  return undefined;
}

function buildQuery(params: LogSearchParams, nextPage: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (key !== "page" && value) query.set(key, value);
  query.set("page", String(nextPage));
  return query.toString();
}

export default async function SystemLogsPage({
  searchParams,
}: {
  searchParams: Promise<LogSearchParams>;
}) {
  const session = await requireSystemOwner("/panel/bog/logi");
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 80) ?? "";
  const kind = params.kind === "visit" ? "visit" : "audit";
  const moduleFilter = moduleOptions.some(([value]) => value === params.module)
    ? (params.module ?? "")
    : "";
  const role = safeEventRole(params.role?.trim());
  const period = ["24h", "7d", "30d", "90d", "all"].includes(
    params.period ?? "",
  )
    ? (params.period ?? "7d")
    : "7d";
  const page = Math.max(1, Math.min(1000, Number(params.page) || 1));
  const from = startDate(period);
  const skip = (page - 1) * pageSize;
  const schools = await db.school.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const schoolId = safeEventSchool(
    params.school?.trim(),
    new Set(schools.map((school) => school.id)),
    kind === "visit",
  );

  const auditWhere = {
    ...(schoolId ? { schoolId } : {}),
    ...(from ? { createdAt: { gte: from } } : {}),
    ...(moduleFilter ? { action: { startsWith: `${moduleFilter}.` } } : {}),
    ...(role ? { actor: { role } } : {}),
    ...(query
      ? {
          OR: [
            { action: { contains: query, mode: "insensitive" as const } },
            { entityType: { contains: query, mode: "insensitive" as const } },
            { entityId: { contains: query, mode: "insensitive" as const } },
            {
              actor: {
                name: { contains: query, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };
  const visitWhere = {
    ...(schoolId === "platform"
      ? { schoolId: null }
      : schoolId
        ? { schoolId }
        : {}),
    ...(from ? { visitedAt: { gte: from } } : {}),
    ...(role ? { user: { role } } : {}),
    ...(query
      ? {
          OR: [
            { path: { contains: query, mode: "insensitive" as const } },
            { clientHash: { contains: query, mode: "insensitive" as const } },
            { regionName: { contains: query, mode: "insensitive" as const } },
            {
              user: { name: { contains: query, mode: "insensitive" as const } },
            },
          ],
        }
      : {}),
  };
  const dayAgo = startDate("24h")!;
  const [total, events, actionToday, visitToday, activeActors] =
    await Promise.all([
      kind === "audit"
        ? db.auditLog.count({ where: auditWhere })
        : db.pageVisit.count({ where: visitWhere }),
      kind === "audit"
        ? db.auditLog.findMany({
            where: auditWhere,
            orderBy: { createdAt: "desc" },
            skip,
            take: pageSize,
            select: {
              id: true,
              action: true,
              entityType: true,
              entityId: true,
              metadata: true,
              ipAddressHash: true,
              createdAt: true,
              actor: { select: { name: true, role: true } },
              school: { select: { name: true } },
            },
          })
        : db.pageVisit.findMany({
            where: visitWhere,
            orderBy: { visitedAt: "desc" },
            skip,
            take: pageSize,
            select: {
              id: true,
              path: true,
              countryCode: true,
              regionCode: true,
              regionName: true,
              clientHash: true,
              deviceFamily: true,
              browserFamily: true,
              visitedAt: true,
              user: { select: { name: true, role: true } },
              school: { select: { name: true } },
            },
          }),
      db.auditLog.count({ where: { createdAt: { gte: dayAgo } } }),
      db.pageVisit.count({ where: { visitedAt: { gte: dayAgo } } }),
      db.auditLog.groupBy({
        by: ["actorId"],
        where: { actorId: { not: null }, createdAt: { gte: dayAgo } },
      }),
    ]);
  const eventRows = events as Array<AuditEventRow | VisitEventRow>;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AuthenticatedPanelShell session={session} active="logs">
      <header className="role-panel-heading">
        <div>
          <span className="section-kicker">Tylko właściciel systemu</span>
          <h1>Centrum zdarzeń</h1>
          <p>
            Każda zapisana operacja biznesowa i każde wejście na ekran są
            dostępne osobno. Sekrety oraz prywatna treść nigdy nie trafiają do
            tego widoku.
          </p>
        </div>
        <span className="owner-security-chip">
          <ShieldCheck aria-hidden="true" /> Widok chroniony MFA
        </span>
      </header>

      <section
        className="owner-event-summary"
        aria-label="Aktywność z ostatnich 24 godzin"
      >
        <article>
          <Activity aria-hidden="true" />
          <span>Operacje</span>
          <strong>{actionToday}</strong>
          <small>ostatnie 24 godziny</small>
        </article>
        <article>
          <Eye aria-hidden="true" />
          <span>Wyświetlenia</span>
          <strong>{visitToday}</strong>
          <small>ostatnie 24 godziny</small>
        </article>
        <article>
          <UserRound aria-hidden="true" />
          <span>Aktywni wykonawcy</span>
          <strong>{activeActors.length}</strong>
          <small>unikalne konta z operacjami</small>
        </article>
      </section>

      <form
        className="owner-log-filters owner-log-filters-expanded"
        method="get"
      >
        <label>
          <span>Rodzaj zdarzeń</span>
          <select name="kind" defaultValue={kind}>
            <option value="audit">Operacje i zmiany</option>
            <option value="visit">Wejścia na ekrany</option>
          </select>
        </label>
        <label>
          <span>Szukaj</span>
          <span className="owner-search-field">
            <Search aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={
                kind === "audit"
                  ? "akcja, osoba lub obiekt"
                  : "ekran, region lub kod klienta"
              }
            />
          </span>
        </label>
        <label>
          <span>Okres</span>
          <select name="period" defaultValue={period}>
            <option value="24h">24 godziny</option>
            <option value="7d">7 dni</option>
            <option value="30d">30 dni</option>
            <option value="90d">90 dni</option>
            <option value="all">Cała historia</option>
          </select>
        </label>
        {kind === "audit" ? (
          <label>
            <span>Moduł</span>
            <select name="module" defaultValue={moduleFilter}>
              <option value="">Wszystkie moduły</option>
              {moduleOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span>Rola</span>
          <select name="role" defaultValue={role}>
            <option value="">Wszystkie role i goście</option>
            {ownerEventRoles.map((value) => (
              <option key={value} value={value}>
                {value === "SYSTEM_OWNER"
                  ? "Właściciel systemu"
                  : value === "DIRECTOR"
                    ? "Dyrektor"
                    : value === "TEACHER"
                      ? "Wykładowca"
                      : value === "PARENT"
                        ? "Rodzic"
                        : "Uczeń"}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Źródło</span>
          <select name="school" defaultValue={schoolId}>
            <option value="">Wszystkie szkoły i produkt</option>
            {kind === "visit" ? (
              <option value="platform">Publiczny pokaz produktu</option>
            ) : null}
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-primary" type="submit">
          <Filter aria-hidden="true" /> Zastosuj filtry
        </button>
      </form>

      <section className="owner-deep-log-list" aria-live="polite">
        <header>
          <strong>
            {total} zdarzeń · strona {Math.min(page, totalPages)} z {totalPages}
          </strong>
          <small>Najnowsze są na górze</small>
        </header>
        {eventRows.length ? (
          eventRows.map((entry) =>
            kind === "audit" && "action" in entry ? (
              <article
                key={entry.id}
                className={`owner-event-row tone-${getAuditEventTone(entry.action)}`}
              >
                <span className="owner-log-time">
                  {formatDate(entry.createdAt)}
                </span>
                <span className="owner-log-action">
                  <strong>{getAuditActionLabel(entry.action)}</strong>
                  <small>
                    {getAuditModule(entry.action)} · {entry.action}
                  </small>
                </span>
                <span className="owner-log-actor">
                  <strong>{entry.actor?.name ?? "System"}</strong>
                  <small>
                    {entry.actor?.role ?? "SYSTEM"} · {entry.school.name}
                  </small>
                </span>
                <details>
                  <summary>Pokaż pełny ślad</summary>
                  <pre>
                    {JSON.stringify(
                      sanitizeDiagnosticValue({
                        entityType: entry.entityType,
                        entityId: entry.entityId,
                        clientCode: entry.ipAddressHash,
                        metadata: entry.metadata,
                      }),
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </article>
            ) : "path" in entry ? (
              <article
                key={entry.id}
                className="owner-event-row owner-visit-row"
              >
                <span className="owner-log-time">
                  {formatDate(entry.visitedAt)}
                </span>
                <span className="owner-log-action">
                  <strong>{entry.path}</strong>
                  <small>
                    Wyświetlenie ekranu · klient{" "}
                    {entry.clientHash ?? "bez kodu"}
                  </small>
                </span>
                <span className="owner-log-actor">
                  <strong>{entry.user?.name ?? "Gość"}</strong>
                  <small>
                    {entry.user?.role ?? "PUBLIC"} ·{" "}
                    {entry.school?.name ?? "Publiczny pokaz produktu"}
                  </small>
                </span>
                <details>
                  <summary>Urządzenie i region</summary>
                  <div className="owner-visit-details">
                    <span>
                      <MapPinned aria-hidden="true" />{" "}
                      {entry.regionName ??
                        entry.regionCode ??
                        entry.countryCode ??
                        "Brak przybliżonego regionu"}
                    </span>
                    <span>
                      {entry.deviceFamily ?? "Nieznane urządzenie"} ·{" "}
                      {entry.browserFamily ?? "Inna przeglądarka"}
                    </span>
                  </div>
                </details>
              </article>
            ) : null,
          )
        ) : (
          <div className="owner-log-empty">
            <Search aria-hidden="true" />
            <strong>Brak zdarzeń dla tych filtrów</strong>
            <span>Zmień okres albo wyczyść wyszukiwanie.</span>
          </div>
        )}
        {totalPages > 1 ? (
          <nav className="owner-log-pagination" aria-label="Strony zdarzeń">
            {page > 1 ? (
              <Link
                className="button button-secondary"
                href={`?${buildQuery(params, page - 1)}`}
              >
                <ChevronLeft aria-hidden="true" /> Nowsze
              </Link>
            ) : (
              <span />
            )}
            <span>
              {skip + 1}–{Math.min(skip + pageSize, total)} z {total}
            </span>
            {page < totalPages ? (
              <Link
                className="button button-secondary"
                href={`?${buildQuery(params, page + 1)}`}
              >
                Starsze <ChevronRight aria-hidden="true" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </AuthenticatedPanelShell>
  );
}
