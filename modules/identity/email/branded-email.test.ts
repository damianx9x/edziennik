import { describe, expect, it } from "vitest";
import { renderBrandedEmail } from "./branded-email";

describe("branded email", () => {
  it("escapes untrusted text and preserves a canonical activation URL in button and fallback", () => {
    const html = renderBrandedEmail({ subject: "Zaproszenie <script>", category: "invitation", text: 'Dzień dobry <img src=x onerror=alert(1)>\n\nUstaw hasło: https://school.test/zaproszenie/test?a=1&b=2' }, "https://school.test");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("Aktywuj moje konto");
    expect(html.match(/href="https:\/\/school.test\/zaproszenie\/test\?a=1&amp;b=2"/g)).toHaveLength(2);
  });
  it("never turns an external URL into the main account button", () => {
    const html = renderBrandedEmail({ subject: "Wiadomość", category: "message", text: "https://evil.test/hello" }, "https://school.test");
    expect(html).toContain('href="https://school.test/panel/wiadomosci"');
    expect(html).not.toContain('href="https://evil.test');
  });
});
