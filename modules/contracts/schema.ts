import { z } from "zod";

const contractTermsSchema = z.object({
  title: z.string().trim().min(3, "Wpisz nazwę umowy.").max(120),
  acceptanceMode: z.enum(["DOCUMENTARY", "EXTERNAL_SIGNATURE"]),
  serviceSummary: z
    .string()
    .trim()
    .min(10, "Krótko opisz zakres i okres usługi.")
    .max(500),
  requiresPayment: z.enum(["yes", "no"]),
  paymentSummary: z.string().trim().max(500),
  paymentAmount: z.string().trim().max(20),
  paymentLabel: z.string().trim().max(80),
  paymentDueDate: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || !Number.isNaN(Date.parse(`${value}T12:00:00`)),
      "Wpisz poprawny termin płatności.",
    ),
  serviceStartDate: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || !Number.isNaN(Date.parse(`${value}T12:00:00`)),
      "Wpisz poprawną datę rozpoczęcia zajęć.",
    ),
  serviceEndDate: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || !Number.isNaN(Date.parse(`${value}T12:00:00`)),
      "Wpisz poprawną datę zakończenia zajęć.",
    ),
  cancellationSummary: z
    .string()
    .trim()
    .min(10, "Krótko opisz czas trwania oraz zasady wypowiedzenia umowy.")
    .max(700),
  requiresEarlyStartRequest: z.enum(["yes", "no"]),
  legalReadiness: z.literal("confirmed", {
    error: "Potwierdź sprawdzenie informacji i właściwego trybu zawarcia.",
  }),
});

function validateContractTerms(
  data: z.infer<typeof contractTermsSchema>,
  context: z.RefinementCtx,
) {
  if (!data.serviceStartDate || !data.serviceEndDate) {
    context.addIssue({
      code: "custom",
      path: [!data.serviceStartDate ? "serviceStartDate" : "serviceEndDate"],
      message: "Ustaw początek i koniec okresu objętego umową.",
    });
  } else if (data.serviceEndDate < data.serviceStartDate) {
    context.addIssue({
      code: "custom",
      path: ["serviceEndDate"],
      message: "Data zakończenia musi przypadać po dacie rozpoczęcia.",
    });
  }
  if (data.requiresPayment === "yes" && data.paymentSummary.length < 3) {
    context.addIssue({
      code: "custom",
      path: ["paymentSummary"],
      message: "Wpisz cenę lub jasne zasady płatności.",
    });
  }
  if (data.requiresPayment === "yes") {
    const normalizedAmount = data.paymentAmount.replace(",", ".");
    const amount = Number(normalizedAmount);
    if (!/^\d{1,7}([.,]\d{1,2})?$/.test(data.paymentAmount) || amount <= 0) {
      context.addIssue({
        code: "custom",
        path: ["paymentAmount"],
        message: "Wpisz kwotę, np. 320 lub 320,00.",
      });
    }
    if (data.paymentLabel.length < 3) {
      context.addIssue({
        code: "custom",
        path: ["paymentLabel"],
        message: "Nazwij płatność, np. Czesne za wrzesień 2026.",
      });
    }
    if (!data.paymentDueDate) {
      context.addIssue({
        code: "custom",
        path: ["paymentDueDate"],
        message: "Ustaw termin płatności wynikający z umowy.",
      });
    }
  }
}

export const contractAssignmentSchema = contractTermsSchema.extend({
  parentId: z.uuid("Wybierz rodzica."),
  studentId: z.uuid("Wybierz ucznia."),
  expiresAt: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || !Number.isNaN(Date.parse(`${value}T23:59:59`)),
      "Wpisz poprawną datę ważności.",
    ),
}).superRefine(validateContractTerms);

export const contractVersionSchema = contractTermsSchema.superRefine(validateContractTerms);

export const contractAcceptanceSchema = z.object({
  assignmentId: z.uuid(),
  documentConfirmation: z.literal("accepted", {
    error: "Potwierdź przeczytanie dokumentu PDF.",
  }),
  consumerInformationConfirmation: z.literal("accepted", {
    error: "Potwierdź otrzymanie informacji konsumenckich.",
  }),
  paymentConfirmation: z.string().optional(),
  earlyStartRequest: z.string().optional(),
  earlyStartConsequences: z.string().optional(),
});

export type ContractActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};
