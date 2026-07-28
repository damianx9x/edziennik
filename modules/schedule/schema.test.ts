import { describe, expect, it } from "vitest";

import {
  getWeekStartKey,
  intervalsOverlap,
  scheduleGenerationSchema,
  toUtcInterval,
} from "./schema";

describe("schedule interval", () => {
  it("converts Warsaw summer time to UTC", () => {
    const result = toUtcInterval({
      date: "2026-08-03",
      startTime: "15:30",
      durationMinutes: 60,
    });

    expect(result.startAt.toISOString()).toBe("2026-08-03T13:30:00.000Z");
    expect(result.endAt.toISOString()).toBe("2026-08-03T14:30:00.000Z");
  });

  it("rejects lessons outside school hours", () => {
    expect(() =>
      toUtcInterval({
        date: "2026-08-03",
        startTime: "20:30",
        durationMinutes: 60,
      }),
    ).toThrow("Grafik obejmuje godziny");
  });

  it("uses half-open intervals so adjacent lessons do not collide", () => {
    expect(
      intervalsOverlap(
        {
          startAt: new Date("2026-08-03T13:00:00Z"),
          endAt: new Date("2026-08-03T14:00:00Z"),
        },
        {
          startAt: new Date("2026-08-03T14:00:00Z"),
          endAt: new Date("2026-08-03T15:00:00Z"),
        },
      ),
    ).toBe(false);
  });

  it("normalizes navigation to Monday", () => {
    expect(getWeekStartKey("2026-08-06")).toBe("2026-08-03");
  });

  it("accepts an eight-week generation range and rejects a longer one", () => {
    expect(
      scheduleGenerationSchema.safeParse({
        scope: "SCHOOL",
        rangeStart: "2026-07-27",
        rangeEnd: "2026-09-20",
      }).success,
    ).toBe(true);
    expect(
      scheduleGenerationSchema.safeParse({
        scope: "SCHOOL",
        rangeStart: "2026-07-27",
        rangeEnd: "2026-09-21",
      }).success,
    ).toBe(false);
  });
});
