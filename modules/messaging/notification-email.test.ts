import { describe, expect, it } from "vitest";

import { buildGenericMessageEmail } from "./notification-email";

describe("message email privacy", () => {
  it.each(["CHAT", "ANNOUNCEMENT"] as const)(
    "sends only a generic %s notice and a canonical login-protected link",
    (kind) => {
      const email = buildGenericMessageEmail(kind, {
        NEXT_PUBLIC_APP_URL: "https://demo.kingslanguageacademy.pl/ignored",
      });

      expect(email.text).toContain(
        "https://demo.kingslanguageacademy.pl/panel/wiadomosci",
      );
      expect(email.text).toContain("dopiero po zalogowaniu");
      expect(email.subject).not.toContain("uczeń");
      expect(email.text).not.toContain("grupa");
    },
  );

  it("omits an unsafe externally configured link", () => {
    const email = buildGenericMessageEmail("CHAT", {
      NEXT_PUBLIC_APP_URL: "http://untrusted.example",
    });

    expect(email.text).not.toContain("http://untrusted.example");
  });
});
