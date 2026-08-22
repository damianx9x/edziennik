import { describe, expect, it } from "vitest";

import { contractPackageSchema, reuseContractPackageSchema } from "./schema";
import { getContractAcceptanceStatement } from "./legal";

const valid = {
  title: "Pakiet standardowy 2026/27",
  acceptanceMode: "EXTERNAL_SIGNATURE" as const,
  requiresPayment: "yes" as const,
  installmentCount: 10,
  installmentAmount: "350,00",
  totalAmount: "3500,00",
  firstPaymentDueDate: "2026-09-10",
  parentId: "10000000-0000-4000-8000-000000000001",
  studentId: "10000000-0000-4000-8000-000000000002",
  expiresAt: "",
  legalReadiness: "confirmed" as const,
};

describe("contractPackageSchema", () => {
  it("accepts an installment plan without duplicated contract terms", () => {
    expect(contractPackageSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a total that cannot cover the declared regular installments", () => {
    expect(contractPackageSchema.safeParse({ ...valid, totalAmount: "1000" }).success).toBe(false);
  });

  it("validates reuse using only package and recipient", () => {
    expect(reuseContractPackageSchema.safeParse({
      sourceVersionId: "10000000-0000-4000-8000-000000000003",
      parentId: valid.parentId,
      studentId: valid.studentId,
      expiresAt: "",
    }).success).toBe(true);
  });

  it("records the complete document package and installment plan in the statement", () => {
    const statement = getContractAcceptanceStatement({
      title: valid.title,
      version: 2,
      serviceSummary: "Kurs języka angielskiego zgodny z dokumentami KLA.",
      paymentSummary: null,
      requiresPayment: true,
      requiresEarlyStartRequest: false,
      documentTitles: ["Umowa i informacje RODO", "Cennik / kosztorys", "Harmonogram zajęć"],
      installmentCount: 10,
      installmentAmountCents: 35000,
      totalAmountCents: 350000,
    });
    expect(statement).toContain("cały pakiet");
    expect(statement).toContain("Harmonogram zajęć");
    expect(statement).toContain("10 rat po 350,00 zł");
    expect(statement).toContain("łącznie 3500,00 zł");
  });
});
