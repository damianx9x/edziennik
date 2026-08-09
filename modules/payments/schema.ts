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
  studentId: z.uuid("Wybierz ucznia."),
  period: z
    .string()
    .trim()
    .min(3, "Wpisz okres, np. wrzesień 2026.")
    .max(40),
  status: z.enum(paymentStatusValues),
  dueDate: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || !Number.isNaN(Date.parse(`${value}T12:00:00`)),
      "Wpisz poprawny termin.",
    ),
  note: z.string().trim().max(240, "Notatka może mieć do 240 znaków."),
});

export type PaymentActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};
