import { describe, expect, it } from "vitest";
import { summarizeBenchmark } from "./benchmark-result";

describe("summarizeBenchmark", () => {
  it("keeps unexpected failures separate from controlled 429 responses", () => {
    expect(summarizeBenchmark(JSON.stringify({ status: "ok", results: [
      { requestsPerSecond: 42.5, p95Ms: 91, unexpectedErrors: 1, throttled: 3 },
      { requestsPerSecond: 18, p95Ms: 140, unexpectedErrors: 0, throttled: 2 },
    ] }))).toEqual({ status: "ok", peakRequestsPerSecond: 42.5, worstP95Ms: 140, unexpectedErrors: 1, throttledResponses: 5 });
  });

  it("rejects an unknown shell contract", () => {
    expect(() => summarizeBenchmark('{"status":"maybe"}')).toThrow("nieprawidłowy wynik");
  });
});
