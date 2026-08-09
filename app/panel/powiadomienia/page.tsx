import { Bell, BellRing, Check, Clock3, MessageCircleMore, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requireActiveSession } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { updateNotificationAction } from "@/modules/notifications/actions";
import { getNotifications } from "@/modules/notifications/service";

export const metadata: Metadata = { title: "Powiadomienia" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await requireActiveSession("/panel/powiadomienia");
  const items = await getNotifications(session);
  const unread = items.filter((item) => !item.read).length;
  return (
    <AuthenticatedPanelShell session={session} active="notifications">
      <header className="role-panel-heading notification-center-heading">
        <div><span className="section-kicker">Twoje centrum uwagi</span><h1>Powiadomienia</h1><p>Umowy, płatności, wiadomości i sprawy szkoły w jednej, krótkiej kolejce.</p></div>
        <span className="stage-one-badge"><Bell aria-hidden="true" /> {unread} nowych</span>
      </header>
      <section className="notification-trigger-guide" aria-label="Co tworzy powiadomienia">
        <BellRing aria-hidden="true" /><div><strong>Powiadamiamy tylko wtedy, gdy warto coś zrobić.</strong><span>Nowa wiadomość, umowa do sprawdzenia, termin płatności, błąd wysyłki lub zmiana czekająca na decyzję.</span></div>
      </section>
      {items.length === 0 ? <section className="notification-empty"><Check aria-hidden="true" /><h2>Wszystko przeczytane</h2><p>Nie ma teraz spraw wymagających Twojej uwagi.</p></section> : (
        <section className="notification-feed" aria-label="Lista powiadomień">
          {items.map((item) => <article key={item.key} className={item.read ? "read" : "unread"}>
            <span className={`notification-kind notification-${item.kind.toLowerCase()}`}>{item.kind === "WARNING" ? <TriangleAlert /> : item.kind === "MESSAGE" ? <MessageCircleMore /> : item.kind === "ACTION" ? <BellRing /> : <Clock3 />}</span>
            <Link href={item.href}><span>{item.read ? "Przeczytane" : "Nowe"}</span><h2>{item.title}</h2><p>{item.description}</p><time>{formatDate(item.occurredAt)}</time></Link>
            <div className="notification-actions">
              <form action={updateNotificationAction}><input type="hidden" name="key" value={item.key} /><input type="hidden" name="action" value={item.read ? "unread" : "read"} /><button type="submit">{item.read ? "Oznacz jako nowe" : "Oznacz jako przeczytane"}</button></form>
              <form action={updateNotificationAction}><input type="hidden" name="key" value={item.key} /><input type="hidden" name="action" value="snooze" /><button type="submit"><Clock3 /> Przypomnij jutro</button></form>
            </div>
          </article>)}
        </section>
      )}
    </AuthenticatedPanelShell>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Warsaw" }).format(date);
}
