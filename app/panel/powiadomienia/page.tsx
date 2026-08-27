import { Bell, BellRing } from "lucide-react";
import type { Metadata } from "next";

import { requireActiveSession } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { NotificationCenter } from "@/modules/notifications/components/notification-center";
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
      <NotificationCenter initialItems={items.map((item) => ({ ...item, occurredAt: item.occurredAt.toISOString() }))} />
    </AuthenticatedPanelShell>
  );
}
