"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash, randomUUID } from "node:crypto";

import { db } from "@/lib/server/db";
import { can, type Actor } from "@/modules/access-control/can";
import { requireActiveSession } from "@/modules/identity/auth/session";
import { isPrivilegedIdentityRole } from "@/modules/identity/auth/access";
import { getFileStorage } from "@/modules/files/storage";

import { canUseConversation, canUseGroupConversation, getConversationRecipientIds, getGroupRecipientIds } from "./access";
import { processEmailDeliveryQueue } from "./queue";
import { announcementSchema, directConversationSchema, messageSchema, type MessagingActionState } from "./schema";

const messagesPath = "/panel/wiadomosci";
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const attachmentTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

function directConversationKey(schoolId: string, participantIds: string[]) {
  return createHash("sha256")
    .update(`${schoolId}:${[...new Set(participantIds)].sort().join(":")}`)
    .digest("hex");
}

async function getOrCreateDirectConversation(input: {
  schoolId: string;
  actorId: string;
  participantIds: string[];
  title: string;
}) {
  const participantIds = [...new Set([...input.participantIds, input.actorId])];
  const validUsers = await db.user.findMany({
    where: { id: { in: participantIds }, schoolId: input.schoolId, status: "ACTIVE", archivedAt: null, role: { in: ["SYSTEM_OWNER", "DIRECTOR", "TEACHER", "PARENT", "STUDENT"] } },
    select: { id: true },
  });
  if (validUsers.length !== participantIds.length) return null;
  const directKey = directConversationKey(input.schoolId, participantIds);
  return db.$transaction(async (tx) => {
    const conversation = await tx.conversation.upsert({
      where: { directKey },
      create: { schoolId: input.schoolId, kind: "DIRECT", title: input.title, directKey, createdById: input.actorId },
      update: { archivedAt: null },
    });
    await tx.conversationParticipant.createMany({
      data: validUsers.map((user) => ({ conversationId: conversation.id, userId: user.id, schoolId: input.schoolId, addedById: input.actorId })),
      skipDuplicates: true,
    });
    await tx.conversationParticipant.updateMany({
      where: { conversationId: conversation.id, userId: { in: participantIds } },
      data: { archivedAt: null },
    });
    if (conversation.createdAt.getTime() === conversation.updatedAt.getTime()) {
      await tx.auditLog.create({ data: { schoolId: input.schoolId, actorId: input.actorId, action: "messages.direct_conversation.created", entityType: "Conversation", entityId: conversation.id, metadata: { participantCount: validUsers.length } } });
    }
    return conversation;
  });
}

async function prepareAttachment(formData: FormData) {
  const file = formData.get("attachment");
  if (!(file instanceof File) || file.size === 0) return { file: null, bytes: null };
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("Załącznik może mieć maksymalnie 8 MB.");
  if (!attachmentTypes.has(file.type)) throw new Error("Dołącz PDF, JPG albo PNG.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const valid = file.type === "application/pdf"
    ? new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-"
    : file.type === "image/png"
      ? bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  if (!valid) throw new Error("Plik jest uszkodzony albo ma nieprawidłowy format.");
  return { file, bytes };
}

async function isRateLimited(userId: string) {
  return (await db.auditLog.count({
    where: { actorId: userId, action: { in: ["messages.sent", "announcements.sent"] }, createdAt: { gte: new Date(Date.now() - 60_000) } },
  })) >= 10;
}

export async function sendMessageAction(_previous: MessagingActionState, formData: FormData): Promise<MessagingActionState> {
  const session = await requireActiveSession(messagesPath);
  const parsed = messageSchema.safeParse({ groupId: formData.get("groupId") || undefined, conversationId: formData.get("conversationId") || undefined, body: formData.get("body"), requiresAcknowledgement: formData.get("requiresAcknowledgement") === "on", clientRequestId: formData.get("clientRequestId") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Sprawdź wiadomość." };
  const allowed = parsed.data.conversationId
    ? await canUseConversation(session, parsed.data.conversationId)
    : await canUseGroupConversation(session, parsed.data.groupId!);
  if (!allowed) return { status: "error", message: "Nie masz dostępu do tej rozmowy." };
  if (await isRateLimited(session.user.id)) return { status: "error", message: "Wysłano wiele wiadomości. Poczekaj minutę i spróbuj ponownie." };

  const existing = await db.message.findUnique({ where: { authorId_clientRequestId: { authorId: session.user.id, clientRequestId: parsed.data.clientRequestId } }, select: { id: true } });
  if (existing) return { status: "success", message: "Wiadomość została już wysłana." };
  const recipients = parsed.data.conversationId
    ? await getConversationRecipientIds(parsed.data.conversationId, session.user.schoolId, session.user.id)
    : await getGroupRecipientIds(parsed.data.groupId!, session.user.schoolId, session.user.id);
  let attachment: Awaited<ReturnType<typeof prepareAttachment>>;
  try { attachment = await prepareAttachment(formData); } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Sprawdź załącznik." }; }
  const storage = getFileStorage();
  let stored: Awaited<ReturnType<typeof storage.put>> | null = null;
  try {
    if (attachment.bytes) stored = await storage.put({ schoolId: session.user.schoolId, bytes: attachment.bytes });
    await db.$transaction(async (tx) => {
      const conversation = parsed.data.conversationId
        ? await tx.conversation.update({ where: { id: parsed.data.conversationId }, data: { updatedAt: new Date() } })
        : await tx.conversation.upsert({
            where: { groupId: parsed.data.groupId! },
            create: { schoolId: session.user.schoolId, groupId: parsed.data.groupId!, kind: "GROUP" },
            update: { updatedAt: new Date() },
          });
      const message = await tx.message.create({ data: { schoolId: session.user.schoolId, conversationId: conversation.id, authorId: session.user.id, body: parsed.data.body, clientRequestId: parsed.data.clientRequestId, requiresAcknowledgement: parsed.data.requiresAcknowledgement } });
      if (stored && attachment.file) {
        const storedFile = await tx.storedFile.create({ data: { schoolId: session.user.schoolId, uploadedById: session.user.id, storageKey: stored.storageKey, originalName: attachment.file.name.slice(0, 180), mimeType: attachment.file.type, sizeBytes: stored.sizeBytes, sha256: stored.sha256, purpose: "MESSAGE_ATTACHMENT" } });
        await tx.messageAttachment.create({ data: { schoolId: session.user.schoolId, messageId: message.id, storedFileId: storedFile.id } });
      }
      if (recipients.length) await tx.emailDelivery.createMany({ data: recipients.map((recipientId) => ({ schoolId: session.user.schoolId, messageId: message.id, recipientId, idempotencyKey: `message:${message.id}:recipient:${recipientId}` })), skipDuplicates: true });
      await tx.messageRead.create({ data: { schoolId: session.user.schoolId, messageId: message.id, userId: session.user.id } });
      await tx.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "messages.sent", entityType: "Conversation", entityId: conversation.id, metadata: { groupId: parsed.data.groupId ?? null, conversationKind: conversation.kind, recipientCount: recipients.length, messageKind: "CHAT" } } });
    });
    revalidatePath(messagesPath);
    after(() => processEmailDeliveryQueue(session.user.schoolId));
    return { status: "success", message: "Wiadomość jest już w rozmowie." };
  } catch {
    if (stored) await storage.remove(stored.storageKey).catch(() => undefined);
    return { status: "error", message: "Nie udało się wysłać wiadomości. Spróbuj ponownie." };
  }
}

export async function sendAnnouncementAction(_previous: MessagingActionState, formData: FormData): Promise<MessagingActionState> {
  const session = await requireActiveSession(messagesPath);
  const actor: Actor = { id: session.user.id, schoolId: session.user.schoolId, role: session.user.role };
  if (!can(actor, "send:announcement", { schoolId: session.user.schoolId })) return { status: "error", message: "Tylko dyrektor może wysyłać ogłoszenia masowe." };
  const parsed = announcementSchema.safeParse({ groupIds: formData.getAll("groupIds"), subject: formData.get("subject"), body: formData.get("body"), requiresAcknowledgement: formData.get("requiresAcknowledgement") === "on", clientRequestId: formData.get("clientRequestId") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Sprawdź ogłoszenie." };
  if (await isRateLimited(session.user.id)) return { status: "error", message: "Poczekaj minutę przed kolejną wysyłką." };
  const groups = await db.courseGroup.findMany({ where: { id: { in: parsed.data.groupIds }, schoolId: session.user.schoolId, isActive: true, archivedAt: null }, select: { id: true } });
  if (groups.length !== new Set(parsed.data.groupIds).size) return { status: "error", message: "Co najmniej jedna grupa jest nieaktywna lub niedostępna." };
  const existing = await db.announcement.findUnique({ where: { authorId_clientRequestId: { authorId: session.user.id, clientRequestId: parsed.data.clientRequestId } }, select: { id: true } });
  if (existing) return { status: "success", message: "To ogłoszenie zostało już wysłane." };
  const recipientMap = new Map<string, string[]>();
  for (const group of groups) recipientMap.set(group.id, await getGroupRecipientIds(group.id, session.user.schoolId, session.user.id));
  let attachment: Awaited<ReturnType<typeof prepareAttachment>>;
  try { attachment = await prepareAttachment(formData); } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Sprawdź załącznik." }; }
  const storage = getFileStorage();
  let stored: Awaited<ReturnType<typeof storage.put>> | null = null;
  try {
    if (attachment.bytes) stored = await storage.put({ schoolId: session.user.schoolId, bytes: attachment.bytes });
    await db.$transaction(async (tx) => {
      const announcement = await tx.announcement.create({ data: { schoolId: session.user.schoolId, authorId: session.user.id, subject: parsed.data.subject, body: parsed.data.body, clientRequestId: parsed.data.clientRequestId } });
      const storedFile = stored && attachment.file ? await tx.storedFile.create({ data: { schoolId: session.user.schoolId, uploadedById: session.user.id, storageKey: stored.storageKey, originalName: attachment.file.name.slice(0, 180), mimeType: attachment.file.type, sizeBytes: stored.sizeBytes, sha256: stored.sha256, purpose: "MESSAGE_ATTACHMENT" } }) : null;
      let deliveryCount = 0;
      for (const group of groups) {
        const conversation = await tx.conversation.upsert({ where: { groupId: group.id }, create: { schoolId: session.user.schoolId, groupId: group.id }, update: { updatedAt: new Date() } });
        const message = await tx.message.create({ data: { schoolId: session.user.schoolId, conversationId: conversation.id, authorId: session.user.id, announcementId: announcement.id, kind: "ANNOUNCEMENT", subject: parsed.data.subject, body: parsed.data.body, clientRequestId: `${parsed.data.clientRequestId}:${group.id}`, requiresAcknowledgement: parsed.data.requiresAcknowledgement } });
        if (storedFile) await tx.messageAttachment.create({ data: { schoolId: session.user.schoolId, messageId: message.id, storedFileId: storedFile.id } });
        const recipients = recipientMap.get(group.id) ?? [];
        deliveryCount += recipients.length;
        if (recipients.length) await tx.emailDelivery.createMany({ data: recipients.map((recipientId) => ({ schoolId: session.user.schoolId, messageId: message.id, recipientId, idempotencyKey: `announcement:${announcement.id}:group:${group.id}:recipient:${recipientId}` })), skipDuplicates: true });
        await tx.messageRead.create({ data: { schoolId: session.user.schoolId, messageId: message.id, userId: session.user.id } });
      }
      await tx.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "announcements.sent", entityType: "Announcement", entityId: announcement.id, metadata: { groupCount: groups.length, deliveryCount } } });
    });
    revalidatePath(messagesPath);
    after(() => processEmailDeliveryQueue(session.user.schoolId));
    return { status: "success", message: `Ogłoszenie trafiło do ${groups.length} ${groups.length === 1 ? "grupy" : "grup"}.` };
  } catch {
    if (stored) await storage.remove(stored.storageKey).catch(() => undefined);
    return { status: "error", message: "Nie udało się wysłać ogłoszenia. Spróbuj ponownie." };
  }
}

export async function createDirectConversationAction(formData: FormData) {
  const session = await requireActiveSession(messagesPath);
  if (!isPrivilegedIdentityRole(session.user.role)) redirect("/panel/brak-dostepu");
  const parsed = directConversationSchema.safeParse({ title: formData.get("title"), participantIds: formData.getAll("participantIds") });
  if (!parsed.success) redirect(`${messagesPath}?blad=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Sprawdź odbiorców.")}`);
  const conversation = await getOrCreateDirectConversation({ schoolId: session.user.schoolId, actorId: session.user.id, participantIds: parsed.data.participantIds, title: parsed.data.title });
  if (!conversation) redirect(`${messagesPath}?blad=${encodeURIComponent("Co najmniej jeden odbiorca jest nieaktywny lub spoza szkoły.")}`);
  redirect(`${messagesPath}?rozmowa=direct:${conversation.id}`);
}

export async function openPersonConversationAction(formData: FormData) {
  const session = await requireActiveSession(messagesPath);
  if (!isPrivilegedIdentityRole(session.user.role)) redirect("/panel/brak-dostepu");
  const personId = String(formData.get("personId") ?? "");
  const person = await db.user.findFirst({
    where: { id: personId, schoolId: session.user.schoolId, status: "ACTIVE", archivedAt: null, role: { in: ["TEACHER", "PARENT", "STUDENT"] } },
    select: { id: true, name: true },
  });
  if (!person) redirect(`${messagesPath}?blad=${encodeURIComponent("Nie można otworzyć rozmowy z tą osobą.")}`);
  const conversation = await getOrCreateDirectConversation({
    schoolId: session.user.schoolId,
    actorId: session.user.id,
    participantIds: [person.id],
    title: `Rozmowa: ${person.name}`,
  });
  if (!conversation) redirect(`${messagesPath}?blad=${encodeURIComponent("Nie można otworzyć rozmowy z tą osobą.")}`);
  redirect(`${messagesPath}?rozmowa=direct:${conversation.id}`);
}

export async function remindContractParentAction(formData: FormData) {
  const session = await requireActiveSession(messagesPath);
  if (!isPrivilegedIdentityRole(session.user.role)) redirect("/panel/brak-dostepu");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const assignment = await db.contractAssignment.findFirst({
    where: { id: assignmentId, schoolId: session.user.schoolId, status: { in: ["SENT", "VIEWED", "SIGNED_PENDING_REVIEW"] } },
    select: { id: true, status: true, parent: { select: { id: true, name: true } }, student: { select: { name: true } }, version: { select: { title: true } } },
  });
  if (!assignment) redirect("/panel/umowy?blad=Nie%20można%20wysłać%20przypomnienia");
  const conversation = await getOrCreateDirectConversation({ schoolId: session.user.schoolId, actorId: session.user.id, participantIds: [assignment.parent.id], title: `Rozmowa: ${assignment.parent.name}` });
  if (!conversation) redirect("/panel/umowy?blad=Nie%20można%20otworzyć%20rozmowy");
  const body = assignment.status === "SIGNED_PENDING_REVIEW"
    ? `Dziękujemy za przesłanie podpisanego dokumentu „${assignment.version.title}” dla ${assignment.student.name}. Szkoła sprawdza plik i poinformuje o wyniku.`
    : `Przypominamy o dokumencie „${assignment.version.title}” dla ${assignment.student.name}. Otwórz zakładkę Umowy w eDzienniku, aby sprawdzić dokumenty i wykonać kolejny krok.`;
  const message = await db.$transaction(async (tx) => {
    const created = await tx.message.create({ data: { schoolId: session.user.schoolId, conversationId: conversation.id, authorId: session.user.id, body, clientRequestId: randomUUID(), requiresAcknowledgement: false } });
    await tx.messageRead.create({ data: { schoolId: session.user.schoolId, messageId: created.id, userId: session.user.id } });
    await tx.emailDelivery.create({ data: { schoolId: session.user.schoolId, messageId: created.id, recipientId: assignment.parent.id, idempotencyKey: `contract-reminder:${assignment.id}:${created.id}` } });
    await tx.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "contracts.reminder.sent", entityType: "ContractAssignment", entityId: assignment.id, metadata: { conversationId: conversation.id, status: assignment.status } } });
    await tx.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
    return created;
  });
  after(() => processEmailDeliveryQueue(session.user.schoolId));
  redirect(`${messagesPath}?rozmowa=direct:${conversation.id}&wyslano=${message.id}`);
}

export async function markMessagesReadAction(messageIds: string[]) {
  const session = await requireActiveSession(messagesPath);
  if (!Array.isArray(messageIds) || messageIds.length === 0 || messageIds.length > 100) return;
  const messages = await db.message.findMany({ where: { id: { in: messageIds }, schoolId: session.user.schoolId }, select: { id: true, conversationId: true } });
  const allowed: string[] = [];
  for (const message of messages) {
    if (await canUseConversation(session, message.conversationId)) allowed.push(message.id);
  }
  if (allowed.length) await db.messageRead.createMany({ data: allowed.map((messageId) => ({ messageId, userId: session.user.id, schoolId: session.user.schoolId })), skipDuplicates: true });
}

export async function acknowledgeMessageAction(formData: FormData) {
  const session = await requireActiveSession(messagesPath);
  const messageId = String(formData.get("messageId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(messageId)) return;
  const message = await db.message.findFirst({ where: { id: messageId, schoolId: session.user.schoolId, requiresAcknowledgement: true }, select: { id: true, authorId: true, conversationId: true } });
  if (!message || message.authorId === session.user.id || !(await canUseConversation(session, message.conversationId))) return;
  await db.$transaction([
    db.messageAcknowledgement.upsert({ where: { messageId_userId: { messageId, userId: session.user.id } }, create: { messageId, userId: session.user.id, schoolId: session.user.schoolId }, update: {} }),
    db.messageRead.upsert({ where: { messageId_userId: { messageId, userId: session.user.id } }, create: { messageId, userId: session.user.id, schoolId: session.user.schoolId }, update: {} }),
  ]);
  revalidatePath(messagesPath);
}

export async function retryEmailQueueAction() {
  const session = await requireActiveSession(messagesPath);
  if (!isPrivilegedIdentityRole(session.user.role)) return;
  await db.emailDelivery.updateMany({ where: { schoolId: session.user.schoolId, status: "FAILED", attempts: { lt: 5 } }, data: { nextAttemptAt: new Date() } });
  await processEmailDeliveryQueue(session.user.schoolId, 50);
  revalidatePath(messagesPath);
}
