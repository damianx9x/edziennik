import { describe, expect, it } from "vitest";

import {
  getContractAcceptanceStatement,
  getContractActionLabel,
} from "./legal";
import { contractAssignmentSchema } from "./schema";

const validAssignment = {
  title: "Umowa 2026/27",
  acceptanceMode: "DOCUMENTARY" as const,
  serviceSummary: "Zajęcia języka angielskiego od września do czerwca.",
  requiresPayment: "yes" as const,
  paymentSummary: "320 zł miesięcznie do 10. dnia miesiąca.",
  paymentAmount: "320,00",
  paymentLabel: "Czesne za wrzesień 2026",
  paymentDueDate: "2026-09-10",
  parentId: "4f593853-ef16-4c74-b917-c48cb3ea63b8",
  studentId: "9753fcdf-8c1f-4356-9cd8-4dd53a0ad9db",
  expiresAt: "",
  legalReadiness: "confirmed" as const,
};

describe("contract legal guardrails", () => {
  it("requires a visible payment summary for a paid contract", () => {
    expect(
      contractAssignmentSchema.safeParse({
        ...validAssignment,
        paymentSummary: "",
      }).success,
    ).toBe(false);
  });

  it("allows a free contract without payment terms", () => {
    expect(
      contractAssignmentSchema.safeParse({
        ...validAssignment,
        requiresPayment: "no",
        paymentSummary: "",
        paymentAmount: "",
        paymentLabel: "",
        paymentDueDate: "",
      }).success,
    ).toBe(true);
  });

  it("records the exact paid-contract declaration and uses an unambiguous label", () => {
    const statement = getContractAcceptanceStatement({
      title: validAssignment.title,
      version: 2,
      serviceSummary: validAssignment.serviceSummary,
      requiresPayment: true,
      paymentSummary: validAssignment.paymentSummary,
      paymentAmountCents: 32000,
      paymentLabel: validAssignment.paymentLabel,
      paymentDueDate: "10 wrz 2026",
    });

    expect(statement).toContain("wersja 2");
    expect(statement).toContain("obowiązkiem zapłaty");
    expect(statement).toContain(validAssignment.paymentSummary);
    expect(statement).toContain("320,00 zł brutto");
    expect(statement).toContain(validAssignment.paymentLabel);
    expect(getContractActionLabel(true)).toBe("Zamówienie z obowiązkiem zapłaty");
  });
});
