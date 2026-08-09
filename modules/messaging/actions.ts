"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/server/db";
import { can, type Actor } from "@/modules/access-control/can";
import { requireActiveSession } from "@/modules/identity/auth/session";
import { getFileStorage } from "@/modules/files/storage";

import { canUseGroupConversation, getGroupRecipientIds } from "./access";
import { processEmailDeliveryQueue } from "./queue";
import { announcementSchema, directorAccessSchema, messageSchema, type MessagingActionState } from "./schema";

const messagesPath = "/panel/wiadomosci";
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const attachmentTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

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
  const parsed = messageSchema.safeParse({ groupId: formData.get("groupId"), body: formData.get("body"), requiresAcknowledgement: formData.get("requiresAcknowledgement") === "on", clientRequestId: formData.get("clientRequestId") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Sprawdź wiadomość." };
  if (!(await canUseGroupConversation(session, parsed.data.groupId))) return { status: "error", message: "Nie masz dostępu do rozmowy tej grupy." };
  if (await isRateLimited(session.user.id)) return { status: "error", message: "Wysłano wiele wiadomości. Poczekaj minutę i spróbuj ponownie." };

  const existing = await db.message.findUnique({ where: { authorId_clientRequestId: { authorId: session.user.id, clientRequestId: parsed.data.clientRequestId } }, select: { id: true } });
  if (existing) return { status: "success", message: "Wiadomość została już wysłana." };
  const recipients = await getGroupRecipientIds(parsed.data.groupId, session.user.schoolId, session.user.id);
  let attachment: Awaited<ReturnType<typeof prepareAttachment>>;
  try { attachment = await prepareAttachment(formData); } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Sprawdź załącznik." }; }
  const storage = getFileStorage();
  let stored: Awaited<ReturnType<typeof storage.put>> | null = null;
  try {
    if (attachment.bytes) stored = await storage.put({ schoolId: session.user.schoolId, bytes: attachment.bytes });
    await db.$transaction(async (tx) => {
      const conversation = await tx.conversation.upsert({
        where: { groupId: parsed.data.groupId },
        create: { schoolId: session.user.schoolId, groupId: parsed.data.groupId },
        update: { updatedAt: new Date() },
      });
      const message = await tx.message.create({ data: { schoolId: session.user.schoolId, conversationId: conversation.id, authorId: session.user.id, body: parsed.data.body, clientRequestId: parsed.data.clientRequestId, requiresAcknowledgement: parsed.data.requiresAcknowledgement } });
      if (stored && attachment.file) {
        const storedFile = await tx.storedFile.create({ data: { schoolId: session.user.schoolId, uploadedById: session.user.id, storageKey: stored.storageKey, originalName: attachment.file.name.slice(0, 180), mimeType: attachment.file.type, sizeBytes: stored.sizeBytes, sha256: stored.sha256, purpose: "MESSAGE_ATTACHMENT" } });
        await tx.messageAttachment.create({ data: { schoolId: session.user.schoolId, messageId: message.id, storedFileId: storedFile.id } });
      }
      if (recipients.length) await tx.emailDelivery.createMany({ data: recipients.map((recipientId) => ({ schoolId: session.user.schoolId, messageId: message.id, recipientId, idempotencyKey: `message:${message.id}:recipient:${recipientId}` })), skipDuplicates: true });
      await tx.messageRead.create({ data: { schoolId: session.user.schoolId, messageId: message.id, userId: session.user.id } });
      await tx.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "messages.sent", entityType: "Conversation", entityId: conversation.id, metadata: { groupId: parsed.data.groupId, recipientCount: recipients.length, messageKind: "CHAT" } } });
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

export async function grantDirectorConversationAccessAction(formData: FormData) {
  const session = await requireActiveSession(messagesPath);
  const actor: Actor = { id: session.user.id, schoolId: session.user.schoolId, role: session.user.role };
  if (!can(actor, "audit:view-conversation", { schoolId: session.user.schoolId })) redirect("/panel/brak-dostepu");
  const parsed = directorAccessSchema.safeParse({ conversationId: formData.get("conversationId"), purpose: formData.get("purpose"), reason: formData.get("reason") });
  if (!parsed.success) redirect(`${messagesPath}?blad=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Sprawdź uzasadnienie.")}`);
  const conversation = await db.conversation.findFirst({ where: { id: parsed.data.conversationId, schoolId: session.user.schoolId, archivedAt: null }, select: { id: true, groupId: true } });
  if (!conversation) redirect(`${messagesPath}?blad=${encodeURIComponent("Rozmowa nie istnieje.")}`);
  const access = await db.$transaction(async (tx) => {
    const created = await tx.directorConversationAccess.create({ data: { schoolId: session.user.schoolId, conversationId: conversation.id, directorId: session.user.id, purpose: parsed.data.purpose, reason: parsed.data.reason, expiresAt: new Date(Date.now() + 15 * 60_000) } });
    await tx.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "messages.director_access.granted", entityType: "Conversation", entityId: conversation.id, metadata: { accessId: created.id, groupId: conversation.groupId, purpose: parsed.data.purpose, expiresAt: created.expiresAt.toISOString() } } });
    return created;
  });
  redirect(`${messagesPath}?rozmowa=${conversation.groupId}&dostep=${access.id}`);
}

export async function markMessagesReadAction(messageIds: string[]) {
  const session = await requireActiveSession(messagesPath);
  if (!Array.isArray(messageIds) || messageIds.length === 0 || messageIds.length > 100) return;
  const messages = await db.message.findMany({ where: { id: { in: messageIds }, schoolId: session.user.schoolId }, select: { id: true, conversation: { select: { groupId: true } } } });
  const allowed: string[] = [];
  for (const message of messages) {
    if (session.user.role === "DIRECTOR") continue;
    if (await canUseGroupConversation(session, message.conversation.groupId)) allowed.push(message.id);
  }
  if (allowed.length) await db.messageRead.createMany({ data: allowed.map((messageId) => ({ messageId, userId: session.user.id, schoolId: session.user.schoolId })), skipDuplicates: true });
}

export async function acknowledgeMessageAction(formData: FormData) {
  const session = await requireActiveSession(messagesPath);
  const messageId = String(formData.get("messageId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(messageId) || session.user.role === "DIRECTOR") return;
  const message = await db.message.findFirst({ where: { id: messageId, schoolId: session.user.schoolId, requiresAcknowledgement: true }, select: { id: true, authorId: true, conversation: { select: { groupId: true } } } });
  if (!message || message.authorId === session.user.id || !(await canUseGroupConversation(session, message.conversation.groupId))) return;
  await db.$transaction([
    db.messageAcknowledgement.upsert({ where: { messageId_userId: { messageId, userId: session.user.id } }, create: { messageId, userId: session.user.id, schoolId: session.user.schoolId }, update: {} }),
    db.messageRead.upsert({ where: { messageId_userId: { messageId, userId: session.user.id } }, create: { messageId, userId: session.user.id, schoolId: session.user.schoolId }, update: {} }),
  ]);
  revalidatePath(messagesPath);
}

export async function retryEmailQueueAction() {
  const session = await requireActiveSession(messagesPath);
  if (session.user.role !== "DIRECTOR") return;
  await db.emailDelivery.updateMany({ where: { schoolId: session.user.schoolId, status: "FAILED", attempts: { lt: 5 } }, data: { nextAttemptAt: new Date() } });
  await processEmailDeliveryQueue(session.user.schoolId, 50);
  revalidatePath(messagesPath);
}
