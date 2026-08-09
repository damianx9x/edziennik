import { z } from "zod";

export const contractAssignmentSchema = z.object({
  title: z.string().trim().min(3, "Wpisz nazwę umowy.").max(120),
  acceptanceMode: z.enum(["DOCUMENTARY", "EXTERNAL_SIGNATURE"]),
  serviceSummary: z
    .string()
    .trim()
    .min(10, "Krótko opisz zakres i okres usługi.")
    .max(500),
  requiresPayment: z.enum(["yes", "no"]),
  paymentSummary: z.string().trim().max(500),
  parentId: z.uuid("Wybierz rodzica."),
  studentId: z.uuid("Wybierz ucznia."),
  expiresAt: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || !Number.isNaN(Date.parse(`${value}T23:59:59`)),
      "Wpisz poprawną datę ważności.",
    ),
  legalReadiness: z.literal("confirmed", {
    error: "Potwierdź sprawdzenie informacji i właściwego trybu zawarcia.",
  }),
}).superRefine((data, context) => {
  if (data.requiresPayment === "yes" && data.paymentSummary.length < 3) {
    context.addIssue({
      code: "custom",
      path: ["paymentSummary"],
      message: "Wpisz cenę lub jasne zasady płatności.",
    });
  }
});

export const contractAcceptanceSchema = z.object({
  assignmentId: z.uuid(),
  confirmation: z.literal("accepted", {
    error: "Potwierdź zapoznanie się z dokumentem.",
  }),
});

export type ContractActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};
