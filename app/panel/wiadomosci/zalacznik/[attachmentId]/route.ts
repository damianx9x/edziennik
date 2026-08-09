import { NextResponse } from "next/server";

import { db } from "@/lib/server/db";
import { getFileStorage } from "@/modules/files/storage";
import { requireActiveSession } from "@/modules/identity/auth/session";
import { canUseGroupConversation } from "@/modules/messaging/access";

export async function GET(request: Request, context: { params: Promise<{ attachmentId: string }> }) {
  const { attachmentId } = await context.params;
  const session = await requireActiveSession("/panel/wiadomosci");
  const attachment = await db.messageAttachment.findFirst({
    where: { id: attachmentId, schoolId: session.user.schoolId },
    select: { message: { select: { authorId: true, conversationId: true, conversation: { select: { groupId: true } } } }, storedFile: { select: { storageKey: true, originalName: true, mimeType: true } } },
  });
  if (!attachment) return NextResponse.json({ message: "Nie znaleziono załącznika." }, { status: 404 });
  let allowed = attachment.message.authorId === session.user.id;
  if (!allowed && session.user.role !== "DIRECTOR") allowed = await canUseGroupConversation(session, attachment.message.conversation.groupId);
  if (!allowed && session.user.role === "DIRECTOR") {
    const accessId = new URL(request.url).searchParams.get("dostep");
    allowed = Boolean(accessId && await db.directorConversationAccess.findFirst({ where: { id: accessId, conversationId: attachment.message.conversationId, directorId: session.user.id, schoolId: session.user.schoolId, expiresAt: { gt: new Date() } }, select: { id: true } }));
  }
  if (!allowed) return NextResponse.json({ message: "Brak dostępu do załącznika." }, { status: 403 });
  const bytes = await getFileStorage().read(attachment.storedFile.storageKey);
  const safeName = attachment.storedFile.originalName.replace(/[^\p{L}\p{N}._-]+/gu, "-");
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": attachment.storedFile.mimeType, "Content-Disposition": `attachment; filename="${safeName || "zalacznik"}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
}
