import { describe, expect, it } from "vitest";

import { paymentRecordSchema } from "./schema";

describe("paymentRecordSchema", () => {
  it("accepts a manual payment status without an amount", () => {
    expect(
      paymentRecordSchema.safeParse({
        studentId: "22222222-2222-4222-8222-222222222222",
        period: "wrzesień 2026",
        status: "PAID",
        dueDate: "2026-09-10",
        note: "Potwierdzono przelew.",
      }).success,
    ).toBe(true);
  });

  it("rejects unsupported status and an overlong note", () => {
    expect(
      paymentRecordSchema.safeParse({
        studentId: "22222222-2222-4222-8222-222222222222",
        period: "wrzesień 2026",
        status: "REFUNDED",
        dueDate: "",
        note: "x".repeat(241),
      }).success,
    ).toBe(false);
  });
});
