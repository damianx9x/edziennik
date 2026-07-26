import {
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  X,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { reviewRecordChangeAction } from "@/modules/records/actions";

export const metadata: Metadata = { title: "Centrum powiadomień" };
export const dynamic = "force-dynamic";

const fieldLabels: Record<string, string> = {
  name: "Nazwa / imię i nazwisko",
  email: "Adres e-mail",
  phone: "Telefon",
  externalId: "Identyfikator",
  capacity: "Liczba miejsc",
  cefrLevel: "Poziom CEFR",
};

export default async function NotificationsPage() {
  const session = await requireDirector("/panel/szkola/powiadomienia");
  const requests = await db.recordChangeRequest.findMany({
    where: {
      schoolId: session.user.schoolId,
      status: "PENDING",
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      requestedBy: { select: { name: true, role: true } },
    },
  });
  const userIds = requests
    .filter((item) => item.entityType === "USER")
    .map((item) => item.entityId);
  const roomIds = requests
    .filter((item) => item.entityType === "ROOM")
    .map((item) => item.entityId);
  const groupIds = requests
    .filter((item) => item.entityType === "GROUP")
    .map((item) => item.entityId);
  const [users, rooms, groups] = await Promise.all([
    db.user.findMany({
      where: { id: { in: userIds }, schoolId: session.user.schoolId },
      select: { id: true, name: true },
    }),
    db.room.findMany({
      where: { id: { in: roomIds }, schoolId: session.user.schoolId },
      select: { id: true, name: true },
    }),
    db.courseGroup.findMany({
      where: { id: { in: groupIds }, schoolId: session.user.schoolId },
      select: { id: true, name: true },
    }),
  ]);
  const names = new Map(
    [...users, ...rooms, ...groups].map((item) => [item.id, item.name]),
  );

  return (
    <AuthenticatedPanelShell session={session} active="notifications">
      <header className="role-panel-heading">
        <div>
          <span className="section-kicker">Do sprawdzenia</span>
          <h1>Centrum powiadomień</h1>
          <p>
            Tutaj zatwierdzasz korekty kartotek przesłane przez wykładowców.
            Każda decyzja zapisuje się w historii.
          </p>
        </div>
        <span className="stage-one-badge">
          <Bell aria-hidden="true" /> {requests.length} oczekuje
        </span>
      </header>

      {requests.length === 0 ? (
        <section className="notification-empty">
          <CheckCircle2 aria-hidden="true" />
          <h2>Wszystko sprawdzone</h2>
          <p>Nie ma teraz żadnych zmian oczekujących na Twoją decyzję.</p>
          <Link className="button button-secondary" href="/panel/szkola/kartoteki">
            Otwórz kartoteki
          </Link>
        </section>
      ) : (
        <section className="record-review-list" aria-label="Zmiany do zatwierdzenia">
          {requests.map((request) => {
            const payload =
              request.payload && typeof request.payload === "object"
                ? (request.payload as Record<string, unknown>)
                : {};
            return (
              <article key={request.id}>
                <div className="record-review-heading">
                  <span className="record-review-icon">
                    <Clock3 aria-hidden="true" />
                  </span>
                  <div>
                    <span>
                      {request.entityType === "USER"
                        ? "Kartoteka osoby"
                        : request.entityType === "ROOM"
                          ? "Sala"
                          : "Grupa"}
                    </span>
                    <h2>{names.get(request.entityId) ?? "Nieaktywny rekord"}</h2>
                    <p>
                      Zgłasza: <strong>{request.requestedBy.name}</strong> ·{" "}
                      {formatDate(request.createdAt)}
                    </p>
                  </div>
                </div>
                <dl className="record-review-fields">
                  {request.changedFields.map((field) => (
                    <div key={field}>
                      <dt>{fieldLabels[field] ?? field}</dt>
                      <dd>{formatValue(payload[field])}</dd>
                    </div>
                  ))}
                </dl>
                <div className="record-review-actions">
                  <form action={reviewRecordChangeAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <button className="button button-secondary" type="submit">
                      <X aria-hidden="true" /> Odrzuć
                    </button>
                  </form>
                  <form action={reviewRecordChangeAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button className="button button-primary" type="submit">
                      <Check aria-hidden="true" /> Zatwierdź zmianę
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </AuthenticatedPanelShell>
  );
}

function formatValue(value: unknown) {
  if (value === null || value === "") return "Usunięcie wartości";
  if (typeof value === "number" || typeof value === "string") return String(value);
  return "Nowa wartość";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(date);
}
