import { describe, expect, it } from "vitest";

import { getScheduleTone, SCHEDULE_TONE_COUNT } from "./presentation";

describe("schedule presentation", () => {
  it("keeps the same color for the same resource", () => {
    expect(getScheduleTone("location-a")).toBe(getScheduleTone("location-a"));
  });

  it("always returns a supported color index", () => {
    for (const value of ["", "location-a", "online", "lokalizacja-123"]) {
      expect(getScheduleTone(value)).toBeGreaterThanOrEqual(0);
      expect(getScheduleTone(value)).toBeLessThan(SCHEDULE_TONE_COUNT);
    }
  });
});
