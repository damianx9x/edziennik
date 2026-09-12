import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("bounded client diagnostics", () => {
  beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-12T10:00:00Z")); });
  afterEach(() => vi.useRealTimers());
  it("omits routine clicks and deduplicates a burst of the same failure", async () => {
    const { recordClientEvent, getClientEvents } = await import("./client-events");
    recordClientEvent({ level: "info", code: "click" });
    for (let n = 0; n < 100; n++) recordClientEvent({ level: "error", code: "save.failed", message: "synthetic@example.org" });
    expect(getClientEvents()).toHaveLength(1);
    expect(getClientEvents()[0].message).toBe("[email]");
  });
  it("expires data and bounds a long session", async () => {
    const { recordClientEvent, getClientEvents } = await import("./client-events");
    for (let n = 0; n < 100; n++) recordClientEvent({ level: "warning", code: `failure.${n}` });
    expect(getClientEvents()).toHaveLength(60);
    vi.advanceTimersByTime(31 * 60_000);
    expect(getClientEvents()).toEqual([]);
  });
});
