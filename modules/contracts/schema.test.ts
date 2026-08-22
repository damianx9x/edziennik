import { describe, expect, it } from "vitest";

import { contractAssignmentSchema } from "./schema";

describe("contractAssignmentSchema", () => {
  it("accepts a complete assignment", () => {
    expect(
      contractAssignmentSchema.safeParse({
        title: "Umowa na rok szkolny 2026/27",
        acceptanceMode: "DOCUMENTARY",
        serviceSummary: "Zajęcia języka angielskiego od września do czerwca.",
        requiresPayment: "yes",
        paymentSummary: "320 zł miesięcznie.",
        paymentAmount: "320,00",
        paymentLabel: "Czesne za wrzesień 2026",
        paymentDueDate: "2026-09-10",
        serviceStartDate: "2026-09-01",
        serviceEndDate: "2027-06-30",
        cancellationSummary: "Umowę można wypowiedzieć na zasadach opisanych w PDF.",
        requiresEarlyStartRequest: "no",
        parentId: "11111111-1111-4111-8111-111111111111",
        studentId: "22222222-2222-4222-8222-222222222222",
        expiresAt: "2026-09-30",
        legalReadiness: "confirmed",
      }).success,
    ).toBe(true);
  });

  it("rejects an end date earlier than the service start", () => {
    expect(
      contractAssignmentSchema.safeParse({
        title: "Umowa na rok szkolny 2026/27",
        acceptanceMode: "DOCUMENTARY",
        serviceSummary: "Zajęcia języka angielskiego od września do czerwca.",
        requiresPayment: "no",
        paymentSummary: "",
        paymentAmount: "",
        paymentLabel: "",
        paymentDueDate: "",
        serviceStartDate: "2027-06-30",
        serviceEndDate: "2026-09-01",
        cancellationSummary: "Umowę można wypowiedzieć na zasadach opisanych w PDF.",
        requiresEarlyStartRequest: "no",
        parentId: "11111111-1111-4111-8111-111111111111",
        studentId: "22222222-2222-4222-8222-222222222222",
        expiresAt: "2026-09-30",
        legalReadiness: "confirmed",
      }).success,
    ).toBe(false);
  });

  it("rejects missing people and invalid dates", () => {
    expect(
      contractAssignmentSchema.safeParse({
        title: "x",
        parentId: "",
        studentId: "",
        expiresAt: "not-a-date",
      }).success,
    ).toBe(false);
  });
});
