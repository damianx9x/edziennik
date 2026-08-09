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
  if (session.user.role !== "DIRECTOR") {
    return { status: "error", message: "Tylko dyrektor może zmieniać statusy płatności." };
  }
  const parsed = paymentRecordSchema.safeParse({
    contractAssignmentId: formData.get("contractAssignmentId"),
    status: formData.get("status"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Sprawdź status płatności.",
    };
  }

  const assignment = await db.contractAssignment.findFirst({
    where: {
      id: parsed.data.contractAssignmentId,
      schoolId: session.user.schoolId,
      status: "ACCEPTED",
      version: { requiresPayment: true },
    },
    select: {
      id: true,
      studentId: true,
      version: {
        select: {
          title: true,
          paymentLabel: true,
          paymentDueDate: true,
        },
      },
    },
  });
  if (!assignment) {
    return {
      status: "error",
      message: "Status można ustawić dopiero po zaakceptowaniu umowy przez rodzica.",
    };
  }

  try {
    await db.$transaction(async (tx) => {
      const previous = await tx.paymentRecord.findUnique({
        where: { contractAssignmentId: assignment.id },
        select: { status: true },
      });
      const record = await tx.paymentRecord.upsert({
        where: { contractAssignmentId: assignment.id },
        create: {
          schoolId: session.user.schoolId,
          studentId: assignment.studentId,
          changedById: session.user.id,
          contractAssignmentId: assignment.id,
          period: assignment.version.paymentLabel ?? assignment.version.title,
          status: parsed.data.status,
          dueDate: assignment.version.paymentDueDate,
          note: parsed.data.note || null,
        },
        update: {
          changedById: session.user.id,
          status: parsed.data.status,
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
            contractAssignmentId: assignment.id,
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
