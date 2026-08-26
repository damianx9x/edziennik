import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  isSetupCodeValid,
  isTransactionalEmailConfigured,
  maskEmail,
} from "./security";

describe("first-run security", () => {
  it("porównuje kod z hashem i odrzuca błędny format", () => {
    const hash = createHash("sha256").update("bardzo-dlugi-kod-testowy").digest("hex");
    expect(isSetupCodeValid("bardzo-dlugi-kod-testowy", hash)).toBe(true);
    expect(isSetupCodeValid("inny-kod-testowy", hash)).toBe(false);
    expect(isSetupCodeValid("kod", "nie-hash")).toBe(false);
  });

  it("wymaga kompletnego ustawienia dowolnego dostawcy poczty", () => {
    expect(isTransactionalEmailConfigured({})).toBe(false);
    expect(
      isTransactionalEmailConfigured({
        EMAIL_PROVIDER: "resend",
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: "KLA <noreply@example.test>",
      }),
    ).toBe(true);
  });

  it("maskuje adres w komunikacie", () => {
    expect(maskEmail("kinga@example.pl")).toBe("ki•••@example.pl");
  });
});
