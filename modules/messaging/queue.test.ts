import { describe, expect, it } from "vitest";
import { getRetryDelayMinutes } from "./retry";

describe("email delivery retry", () => {
  it("uses bounded exponential backoff", () => {
    expect([0, 1, 2, 3, 4, 9].map(getRetryDelayMinutes)).toEqual([1, 2, 4, 8, 16, 60]);
  });
});
