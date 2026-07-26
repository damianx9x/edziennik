import { Filter, Search, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { db } from "@/lib/server/db";
import { requireSystemOwner } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { sanitizeDiagnosticValue } from "@/modules/system-owner/diagnostics";

export const metadata: Metadata = { title: "Głębokie logi systemu" };
export const dynamic = "force-dynamic";

type LogSearchParams = {
  q?: string;
  school?: string;
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Warsaw",
  }).format(value);
}

export default async function SystemLogsPage({
  searchParams,
}: {
  searchParams: Promise<LogSearchParams>;
}) {
  const session = await requireSystemOwner("/panel/bog/logi");
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 80) ?? "";
  const schoolId = params.school?.trim() ?? "";
  const schools = await db.school.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const logs = await db.auditLog.findMany({
    where: {
      ...(schoolId ? { schoolId } : {}),
      ...(query
        ? {
            OR: [
              { action: { contains: query, mode: "insensitive" } },
              { entityType: { contains: query, mode: "insensitive" } },
              { entityId: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
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
  });

  return (
    <AuthenticatedPanelShell session={session} active="logs">
      <header className="role-panel-heading">
        <div>
          <span className="section-kicker">Tylko właściciel systemu</span>
          <h1>Głębokie logi</h1>
          <p>
            Ostatnie 200 zdarzeń z audytu. Pola wrażliwe są automatycznie
            ukrywane.
          </p>
        </div>
        <span className="owner-security-chip">
          <ShieldCheck aria-hidden="true" /> Widok chroniony MFA
        </span>
      </header>

      <form className="owner-log-filters" method="get">
        <label>
          <span>Znajdź akcję lub typ obiektu</span>
          <span className="owner-search-field">
            <Search aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="np. records.change albo User"
            />
          </span>
        </label>
        <label>
          <span>Szkoła</span>
          <select name="school" defaultValue={schoolId}>
            <option value="">Wszystkie szkoły</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-primary" type="submit">
          <Filter aria-hidden="true" /> Filtruj
        </button>
      </form>

      <section className="owner-deep-log-list" aria-live="polite">
        <header>
          <strong>{logs.length} zdarzeń</strong>
          <small>Najnowsze są na górze</small>
        </header>
        {logs.length ? (
          logs.map((entry) => (
            <article key={entry.id}>
              <span className="owner-log-time">{formatDate(entry.createdAt)}</span>
              <span className="owner-log-action">
                <strong>{entry.action}</strong>
                <small>
                  {entry.entityType}
                  {entry.entityId ? ` · ${entry.entityId}` : ""}
                </small>
              </span>
              <span className="owner-log-actor">
                <strong>{entry.actor?.name ?? "System"}</strong>
                <small>
                  {entry.actor?.role ?? "SYSTEM"} · {entry.school.name}
                </small>
              </span>
              <details>
                <summary>Pokaż dane techniczne</summary>
                <pre>
                  {JSON.stringify(
                    sanitizeDiagnosticValue(entry.metadata),
                    null,
                    2,
                  )}
                </pre>
              </details>
            </article>
          ))
        ) : (
          <div className="owner-log-empty">
            <Search aria-hidden="true" />
            <strong>Brak zdarzeń dla tych filtrów</strong>
            <span>Wyczyść wyszukiwanie i spróbuj ponownie.</span>
          </div>
        )}
      </section>
    </AuthenticatedPanelShell>
  );
}
