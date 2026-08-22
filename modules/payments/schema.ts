import { z } from "zod";

export const paymentStatusValues = [
  "UNSET",
  "PENDING",
  "PAID",
  "OVERDUE",
] as const;

export const paymentStatusLabels = {
  UNSET: "Nieustalona",
  PENDING: "Oczekuje",
  PAID: "Opłacona",
  OVERDUE: "Po terminie",
} as const;

export const paymentRecordSchema = z.object({
  contractAssignmentId: z.uuid("Nie udało się rozpoznać umowy."),
  paymentInstallmentId: z.union([z.uuid(), z.literal("")]).optional().default(""),
  status: z.enum(paymentStatusValues),
  note: z.string().trim().max(240, "Notatka może mieć do 240 znaków."),
});

export type PaymentDisplayStatus =
  | (typeof paymentStatusValues)[number]
  | "WAITING_SIGNATURE"
  | "CONTRACT_EXPIRED";

export const paymentDisplayStatusLabels: Record<PaymentDisplayStatus, string> = {
  ...paymentStatusLabels,
  WAITING_SIGNATURE: "Czeka na akceptację umowy",
  CONTRACT_EXPIRED: "Umowa wygasła",
};

export function getEffectivePaymentStatus(input: {
  contractStatus: "DRAFT" | "SENT" | "VIEWED" | "SIGNED_PENDING_REVIEW" | "ACCEPTED" | "EXPIRED";
  storedStatus: (typeof paymentStatusValues)[number] | null;
  dueDate: Date | null;
  now?: Date;
}): PaymentDisplayStatus {
  if (input.contractStatus !== "ACCEPTED") {
    return input.contractStatus === "EXPIRED"
      ? "CONTRACT_EXPIRED"
      : "WAITING_SIGNATURE";
  }
  if (input.storedStatus === "PAID") return "PAID";
  const today = input.now ?? new Date();
  if (input.dueDate && input.dueDate.getTime() < today.getTime()) return "OVERDUE";
  return input.storedStatus && input.storedStatus !== "UNSET"
    ? input.storedStatus
    : "PENDING";
}

export type PaymentActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};
