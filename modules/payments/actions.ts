"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";

import { paymentRecordSchema, type PaymentActionState } from "./schema";

const paymentsPath = "/panel/platnosci";

export async function savePaymentStatusAction(
  _previous: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const session = await requireDirector(paymentsPath);
  const parsed = paymentRecordSchema.safeParse({
    studentId: formData.get("studentId"),
    period: formData.get("period"),
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Sprawdź status płatności.",
    };
  }

  const student = await db.user.findFirst({
    where: {
      id: parsed.data.studentId,
      schoolId: session.user.schoolId,
      role: "STUDENT",
      status: "ACTIVE",
      archivedAt: null,
    },
    select: { id: true },
  });
  if (!student) {
    return { status: "error", message: "Wybrany uczeń nie jest aktywny." };
  }

  try {
    await db.$transaction(async (tx) => {
      const previous = await tx.paymentRecord.findUnique({
        where: {
          schoolId_studentId_period: {
            schoolId: session.user.schoolId,
            studentId: parsed.data.studentId,
            period: parsed.data.period,
          },
        },
        select: { status: true },
      });
      const record = await tx.paymentRecord.upsert({
        where: {
          schoolId_studentId_period: {
            schoolId: session.user.schoolId,
            studentId: parsed.data.studentId,
            period: parsed.data.period,
          },
        },
        create: {
          schoolId: session.user.schoolId,
          studentId: parsed.data.studentId,
          changedById: session.user.id,
          period: parsed.data.period,
          status: parsed.data.status,
          dueDate: parsed.data.dueDate
            ? new Date(`${parsed.data.dueDate}T12:00:00`)
            : null,
          note: parsed.data.note || null,
        },
        update: {
          changedById: session.user.id,
          status: parsed.data.status,
          dueDate: parsed.data.dueDate
            ? new Date(`${parsed.data.dueDate}T12:00:00`)
            : null,
          note: parsed.data.note || null,
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId: session.user.schoolId,
          actorId: session.user.id,
          action: "payments.status.changed",
          entityType: "PaymentRecord",
          entityId: record.id,
          metadata: {
            previousStatus: previous?.status ?? null,
            newStatus: parsed.data.status,
            period: parsed.data.period,
          },
        },
      });
    });
    revalidatePath(paymentsPath);
    revalidatePath("/panel/rodzic");
    return { status: "success", message: "Status płatności został zapisany w historii." };
  } catch {
    return { status: "error", message: "Nie udało się zapisać statusu. Spróbuj ponownie." };
  }
}
