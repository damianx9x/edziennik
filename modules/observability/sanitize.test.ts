import { describe, expect, it } from "vitest";

import { sanitizeDiagnosticText } from "./sanitize";

describe("sanitizeDiagnosticText", () => {
  it("redacts an email address", () => {
    expect(sanitizeDiagnosticText("Kontakt: rodzic@example.com")).toBe(
      "Kontakt: [email]",
    );
  });

  it("redacts a Polish phone number", () => {
    expect(sanitizeDiagnosticText("Telefon +48 533 609 841")).toBe(
      "Telefon [telefon]",
    );
  });

  it("redacts sensitive query values", () => {
    expect(
      sanitizeDiagnosticText(
        "https://app.test/reset?token=very-secret-value&email=a@b.pl",
      ),
    ).toBe("https://app.test/reset?token=[ukryte]&email=[ukryte]");
  });

  it("limits oversized messages", () => {
    expect(sanitizeDiagnosticText("error message ".repeat(200))).toHaveLength(
      1200,
    );
  });
});
