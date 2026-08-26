import { db } from "@/lib/server/db";
import type { ActiveSession } from "@/modules/identity/auth/session";
import { getAccessibleGroups } from "@/modules/messaging/access";
import { getEffectivePaymentStatus } from "@/modules/payments/schema";

export type NotificationItem = {
  key: string;
  kind: "ACTION" | "WARNING" | "INFO" | "MESSAGE";
  title: string;
  description: string;
  href: string;
  occurredAt: Date;
  read: boolean;
  snoozedUntil: Date | null;
};

export async function getNotifications(session: ActiveSession): Promise<NotificationItem[]> {
  const now = new Date();
  const raw: Omit<NotificationItem, "read" | "snoozedUntil">[] = [];
  const role = session.user.role;

  if (role === "SYSTEM_OWNER" || role === "DIRECTOR") {
    const [changes, failedDeliveries, assignments, signedContracts, scheduleChanges] = await Promise.all([
      db.recordChangeRequest.findMany({
        where: { schoolId: session.user.schoolId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, createdAt: true, entityType: true },
      }),
      db.emailDelivery.findMany({
        where: { schoolId: session.user.schoolId, status: "FAILED" },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: { id: true, updatedAt: true },
      }),
      paymentAssignments(session.user.schoolId),
      db.contractAssignment.findMany({
        where: {
          schoolId: session.user.schoolId,
          status: "SIGNED_PENDING_REVIEW",
        },
        orderBy: { signedUploadedAt: "desc" },
        take: 50,
        select: {
          id: true,
          signedUploadedAt: true,
          parent: { select: { name: true } },
          version: { select: { title: true } },
        },
      }),
      db.scheduleChangeRequest.findMany({
        where: { schoolId: session.user.schoolId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          kind: true,
          createdAt: true,
          requestedBy: { select: { name: true } },
          scheduleSlot: { select: { group: { select: { name: true } } } },
        },
      }),
    ]);
    for (const item of changes) raw.push({
      key: `record-change:${item.id}`,
      kind: "ACTION",
      title: "Zmiana kartoteki czeka na decyzję",
      description: `Wykładowca przesłał zmianę w ${item.entityType === "USER" ? "kartotece osoby" : item.entityType === "ROOM" ? "sali" : "grupie"}.`,
      href: "/panel/szkola/powiadomienia",
      occurredAt: item.createdAt,
    });
    for (const item of failedDeliveries) raw.push({
      key: `email-failed:${item.id}`,
      kind: "WARNING",
      title: "Nie wysłano powiadomienia e-mail",
      description: "Wiadomość jest w eDzienniku, ale dodatkowy e-mail wymaga ponowienia.",
      href: "/panel/wiadomosci",
      occurredAt: item.updatedAt,
    });
    for (const item of signedContracts) raw.push({
      key: `signed-contract:${item.id}`,
      kind: "ACTION",
      title: "Podpisana umowa czeka na sprawdzenie",
      description: `${item.parent.name} · ${item.version.title}`,
      href: `/panel/umowy?umowa=${item.id}`,
      occurredAt: item.signedUploadedAt ?? now,
    });
    for (const item of scheduleChanges) raw.push({
      key: `schedule-change:${item.id}`,
      kind: "ACTION",
      title: item.kind === "CANCEL" ? "Wniosek o odwołanie zajęć" : "Wniosek o zmianę grafiku",
      description: `${item.requestedBy.name} · ${item.scheduleSlot.group.name}`,
      href: "/panel/plan",
      occurredAt: item.createdAt,
    });
    addPaymentNotifications(raw, assignments, now, true);
  }

  if (role === "PARENT") {
    const [contracts, assignments] = await Promise.all([
      db.contractAssignment.findMany({
        where: { schoolId: session.user.schoolId, parentId: session.user.id, status: { in: ["SENT", "VIEWED"] } },
        orderBy: { sentAt: "desc" },
        select: { id: true, sentAt: true, expiresAt: true, version: { select: { title: true } } },
      }),
      paymentAssignments(session.user.schoolId, session.user.id),
    ]);
    for (const item of contracts) raw.push({
      key: `contract:${item.id}`,
      kind: item.expiresAt && item.expiresAt.getTime() - now.getTime() < 3 * 86_400_000 ? "WARNING" : "ACTION",
      title: "Umowa czeka na sprawdzenie",
      description: item.version.title,
      href: `/panel/umowy?umowa=${item.id}`,
      occurredAt: item.sentAt,
    });
    addPaymentNotifications(raw, assignments, now, false);
  }

  if (["TEACHER", "PARENT", "STUDENT"].includes(role)) {
    const groups = await getAccessibleGroups(session);
    const groupIds = groups.map((group) => group.id);
    if (groupIds.length) {
      const upcomingLessons = await db.scheduleSlot.findMany({
        where: {
          schoolId: session.user.schoolId,
          groupId: { in: groupIds },
          archivedAt: null,
          status: { not: "CANCELLED" },
          startAt: { gte: subMinutes(now, 15), lte: addHours(now, 24) },
          ...(role === "TEACHER"
            ? {
                OR: [
                  { teacherId: session.user.id },
                  { group: { teachers: { some: { teacherId: session.user.id, archivedAt: null } } } },
                ],
              }
            : {}),
        },
        orderBy: { startAt: "asc" },
        take: 20,
        select: {
          id: true,
          startAt: true,
          group: { select: { name: true } },
          room: { select: { name: true, location: { select: { name: true } } } },
          checkIns: {
            where: { studentId: session.user.id },
            select: { id: true },
          },
        },
      });
      const formatter = new Intl.DateTimeFormat("pl-PL", {
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Warsaw",
      });
      for (const lesson of upcomingLessons) {
        const checkInOpen =
          role === "STUDENT" &&
          now >= subMinutes(lesson.startAt, 30) &&
          lesson.checkIns.length === 0;
        raw.push({
          key: `lesson-reminder:${lesson.id}`,
          kind: checkInOpen ? "ACTION" : "INFO",
          title: checkInOpen ? "Potwierdź przybycie na zajęcia" : "Zbliżają się zajęcia z angielskiego",
          description: `${lesson.group.name} · ${formatter.format(lesson.startAt)} · ${lesson.room.location.name}, ${lesson.room.name}`,
          href: "/panel/plan",
          occurredAt: lesson.startAt,
        });
      }
      const cancellations = await db.lessonCancellation.findMany({
        where: {
          schoolId: session.user.schoolId,
          scheduleSlot: { groupId: { in: groupIds } },
          cancelledAt: { gte: new Date(now.getTime() - 30 * 86_400_000) },
        },
        orderBy: { cancelledAt: "desc" },
        take: 30,
        select: {
          id: true,
          reason: true,
          cancelledAt: true,
          scheduleSlot: {
            select: { id: true, startAt: true, group: { select: { name: true } } },
          },
        },
      });
      for (const item of cancellations) {
        raw.push({
          key: `lesson-cancelled:${item.id}`,
          kind: "WARNING",
          title: `Odwołane zajęcia · ${item.scheduleSlot.group.name}`,
          description: `${formatter.format(item.scheduleSlot.startAt)} · ${item.reason}`,
          href: "/panel/plan",
          occurredAt: item.cancelledAt,
        });
      }
    }
    const directConversationIds = (await db.conversationParticipant.findMany({
      where: { schoolId: session.user.schoolId, userId: session.user.id, archivedAt: null, conversation: { archivedAt: null, kind: "DIRECT" } },
      select: { conversationId: true },
    })).map((item) => item.conversationId);
    if (groupIds.length || directConversationIds.length) {
      const messages = await db.message.findMany({
        where: {
          schoolId: session.user.schoolId,
          authorId: { not: session.user.id },
          conversation: { OR: [{ groupId: { in: groupIds } }, { id: { in: directConversationIds } }] },
          reads: { none: { userId: session.user.id } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, subject: true, kind: true, createdAt: true, conversation: { select: { id: true, kind: true, title: true, groupId: true, group: { select: { name: true } } } } },
      });
      for (const item of messages) raw.push({
        key: `message:${item.id}`,
        kind: "MESSAGE",
        title: item.kind === "ANNOUNCEMENT" ? item.subject ?? "Nowe ogłoszenie szkoły" : `Nowa wiadomość · ${item.conversation.kind === "DIRECT" ? item.conversation.title ?? "rozmowa prywatna" : item.conversation.group?.name ?? "grupa"}`,
        description: "Otwórz rozmowę, aby przeczytać bezpiecznie w eDzienniku.",
        href: `/panel/wiadomosci?rozmowa=${encodeURIComponent(item.conversation.kind === "DIRECT" ? `direct:${item.conversation.id}` : `group:${item.conversation.groupId}`)}`,
        occurredAt: item.createdAt,
      });
    }
  }

  const keys = raw.map((item) => item.key);
  const states = keys.length ? await db.notificationState.findMany({
    where: { userId: session.user.id, notificationKey: { in: keys } },
    select: { notificationKey: true, readAt: true, snoozedUntil: true },
  }) : [];
  const stateMap = new Map(states.map((item) => [item.notificationKey, item]));
  return raw
    .map((item) => {
      const state = stateMap.get(item.key);
      return { ...item, read: Boolean(state?.readAt), snoozedUntil: state?.snoozedUntil ?? null };
    })
    .filter((item) => !item.snoozedUntil || item.snoozedUntil <= now)
    .sort((a, b) => Number(a.read) - Number(b.read) || b.occurredAt.getTime() - a.occurredAt.getTime());
}

async function paymentAssignments(schoolId: string, parentId?: string) {
  return db.contractAssignment.findMany({
    where: { schoolId, ...(parentId ? { parentId, status: "ACCEPTED" as const } : {}), version: { requiresPayment: true } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      createdAt: true,
      parent: { select: { name: true } },
      student: { select: { name: true } },
      version: { select: { title: true, paymentDueDate: true } },
      paymentRecord: { select: { status: true, updatedAt: true } },
      paymentInstallments: { orderBy: { installmentNumber: "asc" }, select: { id: true, installmentNumber: true, status: true, dueDate: true, updatedAt: true } },
    },
  });
}

function addPaymentNotifications(
  target: Omit<NotificationItem, "read" | "snoozedUntil">[],
  assignments: Awaited<ReturnType<typeof paymentAssignments>>,
  now: Date,
  management: boolean,
) {
  for (const item of assignments) {
    if (item.paymentInstallments.length) {
      for (const installment of item.paymentInstallments) {
        const effective = getEffectivePaymentStatus({ contractStatus: item.status, storedStatus: installment.status, dueDate: installment.dueDate, now });
        if (!["OVERDUE", "PENDING", "UNSET"].includes(effective)) continue;
        const dueSoon = installment.dueDate.getTime() - now.getTime() <= 5 * 86_400_000;
        if (effective !== "OVERDUE" && !dueSoon) continue;
        target.push({
          key: `payment-installment:${installment.id}:${effective}`,
          kind: effective === "OVERDUE" ? "WARNING" : "INFO",
          title: effective === "OVERDUE" ? `Rata ${installment.installmentNumber} jest po terminie` : `Zbliża się termin raty ${installment.installmentNumber}`,
          description: management ? `${item.parent.name} · ${item.student.name} · ${item.version.title}` : item.version.title,
          href: `/panel/platnosci?platnosc=${installment.id}`,
          occurredAt: installment.updatedAt ?? installment.dueDate,
        });
      }
      continue;
    }
    const effective = getEffectivePaymentStatus({
      contractStatus: item.status,
      storedStatus: item.paymentRecord?.status ?? null,
      dueDate: item.version.paymentDueDate,
      now,
    });
    if (!["OVERDUE", "PENDING", "UNSET"].includes(effective)) continue;
    const dueSoon = item.version.paymentDueDate && item.version.paymentDueDate.getTime() - now.getTime() <= 5 * 86_400_000;
    if (effective !== "OVERDUE" && !dueSoon) continue;
    target.push({
      key: `payment:${item.id}:${effective}`,
      kind: effective === "OVERDUE" ? "WARNING" : "INFO",
      title: effective === "OVERDUE" ? "Minął termin płatności" : "Zbliża się termin płatności",
      description: management ? `${item.parent.name} · ${item.student.name} · ${item.version.title}` : item.version.title,
      href: `/panel/platnosci?platnosc=${item.id}`,
      occurredAt: item.paymentRecord?.updatedAt ?? item.version.paymentDueDate ?? item.createdAt,
    });
  }
}
import { addHours, subMinutes } from "date-fns";
