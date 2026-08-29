import { describe, expect, it } from "vitest";

import { classifyUserAgent, getCoarseRequestContext, trustedClientIp } from "./request-context";

describe("coarse request context", () => {
  it("walks the nginx proxy chain from the trusted loopback hop", () => {
    const headers = new Headers({ "x-forwarded-for": "198.51.100.14, 127.0.0.1" });
    expect(trustedClientIp(headers)).toBe("198.51.100.14");
  });

  it("stores a stable pseudonym and coarse categories, never the IP", () => {
    const context = getCoarseRequestContext(new Headers({
      "x-forwarded-for": "198.51.100.14, 127.0.0.1",
      "cf-ipcountry": "PL",
      "cf-region-code": "MZ",
      "cf-region": "Mazowieckie",
      "user-agent": "Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1",
    }), "test-secret");
    expect(context).toMatchObject({ countryCode: "PL", regionCode: "MZ", regionName: "Mazowieckie", deviceFamily: "Telefon", browserFamily: "Safari" });
    expect(context.clientHash).toMatch(/^[a-f0-9]{16}$/);
    expect(JSON.stringify(context)).not.toContain("198.51.100.14");
  });

  it("recognises common device families", () => {
    expect(classifyUserAgent("Mozilla/5.0 (iPad) Safari").deviceFamily).toBe("Tablet");
    expect(classifyUserAgent("security crawler bot").deviceFamily).toBe("Robot");
  });
});
