import { db } from "@/lib/server/db";
import { emailProvider } from "./email-provider";
import { getRetryDelayMinutes } from "./retry";

export async function processEmailDeliveryQueue(schoolId: string, limit = 20) {
  const jobs = await db.emailDelivery.findMany({
    where: {
      schoolId,
      OR: [
        { status: { in: ["QUEUED", "FAILED"] }, nextAttemptAt: { lte: new Date() } },
        { status: "SENDING", updatedAt: { lte: new Date(Date.now() - 10 * 60_000) } },
      ],
      attempts: { lt: 5 },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      attempts: true,
      idempotencyKey: true,
      recipient: { select: { email: true } },
      message: { select: { kind: true, subject: true, body: true, conversation: { select: { group: { select: { name: true } } } } } },
    },
  });

  for (const job of jobs) {
    const claimed = await db.emailDelivery.updateMany({
      where: {
        id: job.id,
        OR: [
          { status: { in: ["QUEUED", "FAILED"] }, nextAttemptAt: { lte: new Date() } },
          { status: "SENDING", updatedAt: { lte: new Date(Date.now() - 10 * 60_000) } },
        ],
      },
      data: { status: "SENDING" },
    });
    if (claimed.count !== 1) continue;
    const subject = job.message.kind === "ANNOUNCEMENT"
      ? `KLA: ${job.message.subject ?? "Nowe ogłoszenie"}`
      : `KLA: nowa wiadomość w grupie ${job.message.conversation.group.name}`;
    const result = await emailProvider.send({ to: job.recipient.email, subject, text: job.message.body, idempotencyKey: job.idempotencyKey });
    if (result.ok) {
      await db.emailDelivery.update({ where: { id: job.id }, data: { status: "SENT", attempts: { increment: 1 }, sentAt: new Date(), lastErrorCode: null } });
    } else {
      await db.emailDelivery.update({ where: { id: job.id }, data: { status: "FAILED", attempts: { increment: 1 }, lastErrorCode: result.code, nextAttemptAt: new Date(Date.now() + getRetryDelayMinutes(job.attempts + 1) * 60_000) } });
    }
  }
  return { processed: jobs.length };
}
