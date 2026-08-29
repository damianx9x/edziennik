import { describe, expect, it } from "vitest";

import { summarizeProtectedActivity } from "./security-traffic";

describe("protected activity summary", () => {
  it("raises a critical signal without exposing a raw rate-limit key", () => {
    const result = summarizeProtectedActivity([{
      key: "198.51.100.8|/sign-in/email",
      count: 5,
      lastRequest: BigInt(1_700_000_000_000),
    }], "secret");
    expect(result[0]).toMatchObject({ label: "Logowanie hasłem", count: 5, severity: "critical" });
    expect(JSON.stringify(result)).not.toContain("198.51.100.8");
  });
});
