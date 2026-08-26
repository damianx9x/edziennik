import { ExternalLink, MessageCircleMore, Radio, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { db } from "@/lib/server/db";
import { getAccessibleGroups, getDirectConversations } from "@/modules/messaging/access";
import { MessagingWorkspace } from "@/modules/messaging/components/messaging-workspace";
import { requireActiveSession } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { isPrivilegedIdentityRole } from "@/modules/identity/auth/access";

export const metadata: Metadata = { title: "Wiadomości" };
export const dynamic = "force-dynamic";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ rozmowa?: string; blad?: string }> }) {
  const session = await requireActiveSession("/panel/wiadomosci");
  const isManagement = isPrivilegedIdentityRole(session.user.role);
  const params = await searchParams;
  const [groups, directConversations, recipientDirectory] = await Promise.all([
    getAccessibleGroups(session),
    getDirectConversations(session),
    isManagement ? db.user.findMany({
      where: { schoolId: session.user.schoolId, status: "ACTIVE", archivedAt: null, id: { not: session.user.id }, role: { in: ["TEACHER", "PARENT", "STUDENT"] } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, role: true, email: true },
    }) : Promise.resolve([]),
  ]);
  const channels = [
    ...groups.map((group) => ({
      key: `group:${group.id}`, kind: "GROUP" as const, groupId: group.id, conversationId: group.conversation?.id ?? null,
      name: group.name, locationName: group.location.name, messageCount: group.conversation?._count.messages ?? 0,
      lastActivity: group.conversation?.messages[0]?.createdAt.toISOString() ?? null,
      teacherCount: group._count.teachers, studentCount: group._count.enrollments, participants: [] as { id: string; name: string; role: string }[],
    })),
    ...directConversations.map((conversation) => ({
      key: `direct:${conversation.id}`, kind: "DIRECT" as const, groupId: null, conversationId: conversation.id,
      name: conversation.title ?? "Rozmowa prywatna", locationName: "Wybrani odbiorcy", messageCount: conversation._count.messages,
      lastActivity: conversation.messages[0]?.createdAt.toISOString() ?? null, teacherCount: 0, studentCount: 0,
      participants: conversation.participants.map((item) => item.user),
    })),
  ];
  const requestedKey = params.rozmowa?.includes(":") ? params.rozmowa : params.rozmowa ? `group:${params.rozmowa}` : null;
  const selectedKey = requestedKey && channels.some((channel) => channel.key === requestedKey)
    ? requestedKey
    : isManagement ? null : channels[0]?.key ?? null;
  const selected = channels.find((channel) => channel.key === selectedKey) ?? null;
  const canRead = Boolean(selected);

  if (isManagement && selected?.conversationId) {
    await db.auditLog.create({ data: {
      schoolId: session.user.schoolId, actorId: session.user.id, action: "messages.director_viewed",
      entityType: "Conversation", entityId: selected.conversationId,
      metadata: { conversationKind: selected.kind, groupId: selected.groupId },
    } });
  }
  const latestMessages = canRead && selected?.conversationId ? await db.message.findMany({
    where: { conversationId: selected.conversationId, schoolId: session.user.schoolId },
    orderBy: { createdAt: "desc" }, take: 100,
    select: {
      id: true, kind: true, subject: true, body: true, createdAt: true, authorId: true, requiresAcknowledgement: true,
      author: { select: { name: true, role: true } }, reads: { where: { userId: session.user.id }, select: { userId: true } },
      acknowledgements: { where: { userId: session.user.id }, select: { userId: true } },
      attachments: { select: { id: true, storedFile: { select: { originalName: true, sizeBytes: true, mimeType: true } } } },
      _count: { select: { reads: true, acknowledgements: true } }, deliveries: { select: { status: true } },
    },
  }) : [];
  const messages = latestMessages.reverse();
  const queueStats = isManagement ? await db.emailDelivery.groupBy({ by: ["status"], where: { schoolId: session.user.schoolId }, _count: { _all: true } }) : [];

  return <AuthenticatedPanelShell session={session} active="messages">
    <header className="messaging-heading"><div><span className="section-kicker">Komunikacja szkoły</span><h1>{isManagement ? "Wiadomości pod kontrolą" : "Rozmowy bez szukania czatu"}</h1><p>{isManagement ? "Czytaj kanały szkoły bez dodatkowych formularzy. Twórz też rozmowy tylko z wybranymi osobami." : "Wybierz rozmowę, przeczytaj nowe informacje i odpowiedz w jednym miejscu."}</p></div><span className="role-security-chip"><ShieldCheck aria-hidden="true" /> Dostęp według roli</span></header>
    {isManagement ? <aside className="messaging-meta-banner"><MessageCircleMore aria-hidden="true" /><span><strong>Potrzebujesz napisać na Facebooku?</strong><small>Otwórz zwykły Messenger w osobnej karcie. eDziennik nie przekazuje do niego danych uczniów.</small></span><a href="https://www.messenger.com/" target="_blank" rel="noreferrer">Otwórz Messenger <ExternalLink aria-hidden="true" /></a></aside> : null}
    {channels.length === 0 && !isManagement ? <section className="messaging-empty"><MessageCircleMore aria-hidden="true" /><h2>Nie masz jeszcze rozmowy</h2><p>Gdy szkoła przypisze Ci grupę lub doda do rozmowy, pojawi się tutaj automatycznie.</p></section> : <MessagingWorkspace
      role={session.user.role === "SYSTEM_OWNER" ? "DIRECTOR" : session.user.role} currentUserId={session.user.id} errorMessage={params.blad ?? null} channels={channels}
      selectedKey={selectedKey} canRead={canRead} recipientDirectory={recipientDirectory}
      messages={messages.map((message) => ({ ...message, createdAt: message.createdAt.toISOString(), readByCurrent: message.reads.length > 0, acknowledgedByCurrent: message.acknowledgements.length > 0, delivery: { sent: message.deliveries.filter((item) => item.status === "SENT").length, pending: message.deliveries.filter((item) => ["QUEUED", "SENDING"].includes(item.status)).length, failed: message.deliveries.filter((item) => item.status === "FAILED").length } }))}
      queueStats={Object.fromEntries(queueStats.map((item) => [item.status, item._count._all]))}
    />}
    <aside className="messaging-privacy-note"><Radio aria-hidden="true" /><p><strong>To komunikator służbowy szkoły.</strong> Dyrektor ma wgląd w wiadomości. Każde otwarcie przez dyrektora jest automatycznie zapisywane w historii bezpieczeństwa. Nie wpisuj haseł ani danych medycznych.</p></aside>
  </AuthenticatedPanelShell>;
}
