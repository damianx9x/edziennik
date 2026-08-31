import { describe, expect, it } from "vitest";

import { isTrustedSameOrigin } from "./same-origin";

describe("same-origin mutation guard", () => {
  it("accepts an exact forwarded origin", () => {
    const request = new Request("http://internal/api", { headers: { origin: "https://demo.example", host: "internal", "x-forwarded-host": "demo.example", "x-forwarded-proto": "https" } });
    expect(isTrustedSameOrigin(request)).toBe(true);
  });

  it("rejects missing, foreign and lookalike origins", () => {
    expect(isTrustedSameOrigin(new Request("https://demo.example/api"))).toBe(false);
    expect(isTrustedSameOrigin(new Request("https://demo.example/api", { headers: { origin: "https://evil.example", host: "demo.example" } }))).toBe(false);
    expect(isTrustedSameOrigin(new Request("https://demo.example/api", { headers: { origin: "https://demo.example.evil.test", host: "demo.example" } }))).toBe(false);
  });
});
