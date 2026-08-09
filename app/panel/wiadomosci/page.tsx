import { LockKeyhole, MessageCircleMore, Radio, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { db } from "@/lib/server/db";
import { getAccessibleGroups } from "@/modules/messaging/access";
import { MessagingWorkspace } from "@/modules/messaging/components/messaging-workspace";
import { requireActiveSession } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";

export const metadata: Metadata = { title: "Wiadomości" };
export const dynamic = "force-dynamic";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ rozmowa?: string; dostep?: string; blad?: string }> }) {
  const session = await requireActiveSession("/panel/wiadomosci");
  if (session.user.role === "SYSTEM_OWNER") redirect("/panel/brak-dostepu");
  const params = await searchParams;
  const groups = await getAccessibleGroups(session);
  const selectedGroupId = params.rozmowa && groups.some((group) => group.id === params.rozmowa) ? params.rozmowa : session.user.role === "DIRECTOR" ? null : groups[0]?.id ?? null;
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;
  let directorAccessValid = false;
  if (session.user.role === "DIRECTOR" && selectedGroup?.conversation?.id && params.dostep) {
    directorAccessValid = Boolean(await db.directorConversationAccess.findFirst({
      where: { id: params.dostep, conversationId: selectedGroup.conversation.id, directorId: session.user.id, schoolId: session.user.schoolId, expiresAt: { gt: new Date() } },
      select: { id: true },
    }));
  }
  const canRead = session.user.role !== "DIRECTOR" ? Boolean(selectedGroup) : directorAccessValid;
  const messages = canRead && selectedGroup?.conversation?.id
    ? await db.message.findMany({
        where: { conversationId: selectedGroup.conversation.id, schoolId: session.user.schoolId },
        orderBy: { createdAt: "asc" }, take: 100,
        select: {
          id: true, kind: true, subject: true, body: true, createdAt: true, authorId: true, requiresAcknowledgement: true,
          author: { select: { name: true, role: true } },
          reads: { where: { userId: session.user.id }, select: { userId: true } },
          acknowledgements: { where: { userId: session.user.id }, select: { userId: true } },
          attachments: { select: { id: true, storedFile: { select: { originalName: true, sizeBytes: true, mimeType: true } } } },
          _count: { select: { reads: true, acknowledgements: true } },
          deliveries: { select: { status: true } },
        },
      })
    : [];
  const queueStats = session.user.role === "DIRECTOR"
    ? await db.emailDelivery.groupBy({ by: ["status"], where: { schoolId: session.user.schoolId }, _count: { _all: true } })
    : [];

  return (
    <AuthenticatedPanelShell session={session} active="messages">
      <header className="messaging-heading">
        <div>
          <span className="section-kicker">Etap 5 · komunikacja</span>
          <h1>{session.user.role === "DIRECTOR" ? "Wiadomości pod kontrolą" : "Rozmowy bez szukania czatu"}</h1>
          <p>{session.user.role === "DIRECTOR" ? "Wyślij jedno ogłoszenie do wielu grup. Rozmowy otwieraj tylko w uzasadnionej sprawie." : "Wybierz grupę, przeczytaj nowe informacje i odpowiedz w jednym miejscu."}</p>
        </div>
        <span className="role-security-chip"><ShieldCheck aria-hidden="true" /> Dostęp według roli</span>
      </header>
      {groups.length === 0 ? (
        <section className="messaging-empty"><MessageCircleMore aria-hidden="true" /><h2>Nie masz jeszcze przypisanej grupy</h2><p>Gdy szkoła doda Cię do grupy, rozmowa pojawi się tutaj automatycznie.</p></section>
      ) : (
        <MessagingWorkspace
          role={session.user.role}
          currentUserId={session.user.id}
          errorMessage={params.blad ?? null}
          accessId={directorAccessValid ? params.dostep ?? null : null}
          groups={groups.map((group) => ({
            id: group.id, name: group.name, locationName: group.location.name,
            conversationId: group.conversation?.id ?? null,
            messageCount: group.conversation?._count.messages ?? 0,
            lastActivity: group.conversation?.messages[0]?.createdAt.toISOString() ?? null,
            teacherCount: group._count.teachers,
            studentCount: group._count.enrollments,
          }))}
          selectedGroupId={selectedGroupId}
          canRead={canRead}
          messages={messages.map((message) => ({
            ...message, createdAt: message.createdAt.toISOString(), readByCurrent: message.reads.length > 0, acknowledgedByCurrent: message.acknowledgements.length > 0,
            delivery: {
              sent: message.deliveries.filter((item) => item.status === "SENT").length,
              pending: message.deliveries.filter((item) => ["QUEUED", "SENDING"].includes(item.status)).length,
              failed: message.deliveries.filter((item) => item.status === "FAILED").length,
            },
          }))}
          queueStats={Object.fromEntries(queueStats.map((item) => [item.status, item._count._all]))}
        />
      )}
      <aside className="messaging-privacy-note">
        {session.user.role === "DIRECTOR" ? <LockKeyhole aria-hidden="true" /> : <Radio aria-hidden="true" />}
        <p><strong>{session.user.role === "DIRECTOR" ? "Dostęp dyrektora jest jawny." : "To rozmowa służbowa całej grupy."}</strong> {session.user.role === "DIRECTOR" ? "Każde otwarcie treści wymaga celu, uzasadnienia i pozostawia ślad w audycie." : "Nie wpisuj tu danych medycznych, haseł ani prywatnych spraw. W pilnej sprawie skontaktuj się bezpośrednio ze szkołą."}</p>
      </aside>
    </AuthenticatedPanelShell>
  );
}
