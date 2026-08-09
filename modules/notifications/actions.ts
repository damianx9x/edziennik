"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/server/db";
import { requireActiveSession } from "@/modules/identity/auth/session";

const notificationSchema = z.object({
  key: z.string().min(3).max(180).regex(/^[a-z0-9:-]+$/i),
  action: z.enum(["read", "unread", "snooze"]),
});

export async function updateNotificationAction(formData: FormData) {
  const session = await requireActiveSession("/panel/powiadomienia");
  const parsed = notificationSchema.safeParse({ key: formData.get("key"), action: formData.get("action") });
  if (!parsed.success) return;
  const now = new Date();
  await db.notificationState.upsert({
    where: { userId_notificationKey: { userId: session.user.id, notificationKey: parsed.data.key } },
    create: {
      schoolId: session.user.schoolId,
      userId: session.user.id,
      notificationKey: parsed.data.key,
      readAt: parsed.data.action === "read" ? now : null,
      snoozedUntil: parsed.data.action === "snooze" ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : null,
    },
    update: {
      readAt: parsed.data.action === "read" ? now : parsed.data.action === "unread" ? null : undefined,
      snoozedUntil: parsed.data.action === "snooze" ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : null,
    },
  });
  revalidatePath("/panel/powiadomienia");
}
