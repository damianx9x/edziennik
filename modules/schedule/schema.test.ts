import { describe, expect, it } from "vitest";

import {
  cancelScheduleSlotSchema,
  getWeekStartKey,
  intervalsOverlap,
  scheduleGenerationSchema,
  teacherAvailabilitySchema,
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

  it("requires a concrete location when generating one branch", () => {
    expect(
      scheduleGenerationSchema.safeParse({
        scope: "LOCATION",
        targetId: "57c9a10e-73af-4edc-bc1f-17706a3ee0b9",
        rangeStart: "2026-07-27",
        rangeEnd: "2026-08-01",
      }).success,
    ).toBe(true);
    expect(
      scheduleGenerationSchema.safeParse({
        scope: "LOCATION",
        rangeStart: "2026-07-27",
        rangeEnd: "2026-08-01",
      }).success,
    ).toBe(false);
  });

  it("accepts different availability hours on different weekdays", () => {
    expect(
      teacherAvailabilitySchema.safeParse({
        teacherId: "57c9a10e-73af-4edc-bc1f-17706a3ee0b9",
        windows: [
          { weekday: 1, startMinute: 15 * 60, endMinute: 18 * 60, locationId: "57c9a10e-73af-4edc-bc1f-17706a3ee0b9" },
          { weekday: 3, startMinute: 16 * 60 + 30, endMinute: 20 * 60, locationId: "57c9a10e-73af-4edc-bc1f-17706a3ee0b9" },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects two availability rows for the same weekday", () => {
    expect(
      teacherAvailabilitySchema.safeParse({
        teacherId: "57c9a10e-73af-4edc-bc1f-17706a3ee0b9",
        windows: [
          { weekday: 2, startMinute: 15 * 60, endMinute: 18 * 60, locationId: "57c9a10e-73af-4edc-bc1f-17706a3ee0b9" },
          { weekday: 2, startMinute: 17 * 60, endMinute: 19 * 60, locationId: "57c9a10e-73af-4edc-bc1f-17706a3ee0b9" },
        ],
      }).success,
    ).toBe(false);
  });

  it("requires a meaningful cancellation reason", () => {
    expect(cancelScheduleSlotSchema.safeParse({
      slotId: "57c9a10e-73af-4edc-bc1f-17706a3ee0b9",
      reason: "ok",
      notifyGroup: true,
    }).success).toBe(false);
    expect(cancelScheduleSlotSchema.safeParse({
      slotId: "57c9a10e-73af-4edc-bc1f-17706a3ee0b9",
      reason: "Choroba wykładowcy",
      notifyGroup: true,
    }).success).toBe(true);
  });
});
