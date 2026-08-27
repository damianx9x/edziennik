import "server-only";

import { db } from "@/lib/server/db";
import { sendSms } from "@/modules/notifications/sms-provider";
import { SCHOOL_TIME_ZONE } from "./schema";

export async function sendCancellationSms(slotId: string, schoolId: string) {
  const slot = await db.scheduleSlot.findFirst({
    where: { id: slotId, schoolId, status: "CANCELLED" },
    select: {
      startAt: true, group: { select: { name: true, enrollments: { where: { status: "ACTIVE" }, select: { student: { select: { phone: true, childLinks: { where: { archivedAt: null }, select: { parent: { select: { phone: true } } } } } } } } } },
      cancellation: { select: { reason: true } },
    },
  });
  if (!slot) return;
  const phones = slot.group.enrollments.flatMap(({ student }) => [student.phone, ...student.childLinks.map(({ parent }) => parent.phone)]).filter((phone): phone is string => Boolean(phone));
  const when = new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short", timeZone: SCHOOL_TIME_ZONE }).format(slot.startAt);
  const result = await sendSms({ phoneNumbers: phones, text: `KLA: odwołano zajęcia grupy ${slot.group.name} (${when}). Powód: ${slot.cancellation?.reason ?? "sprawdź eDziennik"}.` });
  await db.auditLog.create({ data: { schoolId, action: result.ok ? "schedule.cancellation_sms.queued" : "schedule.cancellation_sms.skipped", entityType: "ScheduleSlot", entityId: slotId, metadata: result.ok ? { recipientCount: result.accepted } : { code: result.code } } });
}
