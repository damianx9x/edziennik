import { describe, expect, it } from "vitest";

import { getEffectivePaymentStatus, paymentRecordSchema } from "./schema";

describe("paymentRecordSchema", () => {
  it("accepts a manual status tied to a contract assignment", () => {
    expect(
      paymentRecordSchema.safeParse({
        contractAssignmentId: "22222222-2222-4222-8222-222222222222",
        status: "PAID",
        note: "Potwierdzono przelew.",
      }).success,
    ).toBe(true);
  });

  it("rejects unsupported status and an overlong note", () => {
    expect(
      paymentRecordSchema.safeParse({
        contractAssignmentId: "22222222-2222-4222-8222-222222222222",
        status: "REFUNDED",
        note: "x".repeat(241),
      }).success,
    ).toBe(false);
  });

  it("does not show a debt before the parent accepts the contract", () => {
    expect(getEffectivePaymentStatus({
      contractStatus: "VIEWED",
      storedStatus: "PENDING",
      dueDate: new Date("2026-09-10T12:00:00"),
      now: new Date("2026-10-01T12:00:00"),
    })).toBe("WAITING_SIGNATURE");
  });

  it("derives overdue state from the accepted contract due date", () => {
    expect(getEffectivePaymentStatus({
      contractStatus: "ACCEPTED",
      storedStatus: "PENDING",
      dueDate: new Date("2026-09-10T12:00:00"),
      now: new Date("2026-10-01T12:00:00"),
    })).toBe("OVERDUE");
  });

  it("keeps a paid contract paid after its due date", () => {
    expect(getEffectivePaymentStatus({
      contractStatus: "ACCEPTED",
      storedStatus: "PAID",
      dueDate: new Date("2026-09-10T12:00:00"),
      now: new Date("2026-10-01T12:00:00"),
    })).toBe("PAID");
  });
});
