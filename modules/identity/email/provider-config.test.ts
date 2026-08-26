import { describe, expect, it } from "vitest";

import { resolveEmailProvider } from "./provider-config";

describe("email provider config", () => {
  it("supports a complete SMTP configuration", () => {
    expect(
      resolveEmailProvider({
        EMAIL_PROVIDER: "smtp",
        SMTP_HOST: "smtp.example.test",
        SMTP_PORT: "587",
        SMTP_USER: "user",
        SMTP_PASSWORD: "secret",
        EMAIL_FROM: "KLA <noreply@example.test>",
      }),
    ).toBe("smtp");
  });

  it("rejects partial SMTP auth and supports Resend as an option", () => {
    expect(
      resolveEmailProvider({
        EMAIL_PROVIDER: "smtp",
        SMTP_HOST: "smtp.example.test",
        SMTP_PORT: "587",
        SMTP_USER: "user",
        EMAIL_FROM: "noreply@example.test",
      }),
    ).toBeNull();
    expect(
      resolveEmailProvider({
        EMAIL_PROVIDER: "resend",
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: "noreply@example.test",
      }),
    ).toBe("resend");
  });
});
