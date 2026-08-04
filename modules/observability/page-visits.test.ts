import { describe, expect, it } from "vitest";

import {
  isSameOriginPageVisit,
  isTrackedPagePath,
  pageVisitHourlyLimit,
} from "./page-visits";

describe("page visit protection", () => {
  it("accepts only known pages and rejects arbitrary slugs", () => {
    expect(isTrackedPagePath("/panel/plan")).toBe(true);
    expect(isTrackedPagePath("/panel/dowolny-slug")).toBe(false);
    expect(isTrackedPagePath("/zaproszenie/private-token")).toBe(false);
  });

  it("uses a finite hourly ceiling for public and authenticated traffic", () => {
    expect(pageVisitHourlyLimit(false)).toBe(300);
    expect(pageVisitHourlyLimit(true)).toBe(180);
  });

  it("accepts the public origin forwarded by the HTTPS tunnel", () => {
    const request = new Request("http://127.0.0.1:3100/api/statystyki/odwiedziny", {
      headers: {
        host: "127.0.0.1:3100",
        origin: "https://demo.kingslanguageacademy.pl",
        "x-forwarded-host": "demo.kingslanguageacademy.pl",
        "x-forwarded-proto": "https",
      },
    });

    expect(isSameOriginPageVisit(request)).toBe(true);
  });

  it("rejects a foreign origin and a request without origin", () => {
    const foreignRequest = new Request(
      "https://demo.kingslanguageacademy.pl/api/statystyki/odwiedziny",
      { headers: { origin: "https://example.org" } },
    );
    const missingOrigin = new Request(
      "https://demo.kingslanguageacademy.pl/api/statystyki/odwiedziny",
    );

    expect(isSameOriginPageVisit(foreignRequest)).toBe(false);
    expect(isSameOriginPageVisit(missingOrigin)).toBe(false);
  });
});
