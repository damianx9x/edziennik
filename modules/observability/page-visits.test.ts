import { describe, expect, it } from "vitest";

import {
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
});
