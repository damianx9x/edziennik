import { NextResponse } from "next/server";

import { db } from "@/lib/server/db";
import { getFileStorage } from "@/modules/files/storage";
import { requireActiveSession } from "@/modules/identity/auth/session";
import { canUseConversation } from "@/modules/messaging/access";

export async function GET(_request: Request, context: { params: Promise<{ attachmentId: string }> }) {
  const { attachmentId } = await context.params;
  const session = await requireActiveSession("/panel/wiadomosci");
  const attachment = await db.messageAttachment.findFirst({
    where: { id: attachmentId, schoolId: session.user.schoolId },
    select: { message: { select: { authorId: true, conversationId: true } }, storedFile: { select: { storageKey: true, originalName: true, mimeType: true } } },
  });
  if (!attachment) return NextResponse.json({ message: "Nie znaleziono załącznika." }, { status: 404 });
  const allowed = attachment.message.authorId === session.user.id || await canUseConversation(session, attachment.message.conversationId);
  if (!allowed) return NextResponse.json({ message: "Brak dostępu do załącznika." }, { status: 403 });
  if (session.user.role === "DIRECTOR") await db.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "messages.attachment.downloaded", entityType: "Conversation", entityId: attachment.message.conversationId, metadata: { attachmentId } } });
  const bytes = await getFileStorage().read(attachment.storedFile.storageKey);
  const safeName = attachment.storedFile.originalName.replace(/[^\p{L}\p{N}._-]+/gu, "-");
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": attachment.storedFile.mimeType, "Content-Disposition": `attachment; filename="${safeName || "zalacznik"}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
}
