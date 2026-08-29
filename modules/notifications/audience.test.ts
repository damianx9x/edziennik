import { describe, expect, it } from "vitest";

import {
  receivesChildLessonNotifications,
  receivesFormalNotifications,
} from "./audience";

describe("notification audience separation", () => {
  it("never exposes contract or payment events to a student", () => {
    expect(receivesFormalNotifications("STUDENT")).toBe(false);
    expect(receivesFormalNotifications("PARENT")).toBe(true);
    expect(receivesFormalNotifications("DIRECTOR")).toBe(true);
    expect(receivesFormalNotifications("SYSTEM_OWNER")).toBe(true);
  });

  it("keeps lessons, cancellations and messages available to child roles", () => {
    expect(receivesChildLessonNotifications("STUDENT")).toBe(true);
    expect(receivesChildLessonNotifications("PARENT")).toBe(true);
    expect(receivesChildLessonNotifications("TEACHER")).toBe(true);
    expect(receivesChildLessonNotifications("DIRECTOR")).toBe(false);
  });
});
