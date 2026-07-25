import { afterEach, describe, expect, it } from "vitest";

import { requireCanonicalAuthUrl } from "./email-provider";

const originalAuthUrl = process.env.BETTER_AUTH_URL;

afterEach(() => {
  process.env.BETTER_AUTH_URL = originalAuthUrl;
});

describe("auth email URLs", () => {
  it("accepts only the configured application origin", () => {
    process.env.BETTER_AUTH_URL = "https://kingslanguageacademy.pl";

    expect(
      requireCanonicalAuthUrl(
        "https://kingslanguageacademy.pl/panel/nowe-haslo?token=test",
      ),
    ).toContain("/panel/nowe-haslo");

    expect(() =>
      requireCanonicalAuthUrl(
        "https://evil.example/panel/nowe-haslo?token=test",
      ),
    ).toThrow("Odrzucono");
  });
});
