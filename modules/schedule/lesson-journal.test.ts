import { describe, expect, it } from "vitest";

import { parseLessonJournalFormData } from "./lesson-journal";

const slotId = "10000000-0000-4000-8000-000000000001";
const studentId = "20000000-0000-4000-8000-000000000002";

describe("lesson journal input", () => {
  it("normalizes an empty topic and an unmarked student", () => {
    const formData = new FormData();
    formData.set("slotId", slotId);
    formData.set("version", "2");
    formData.set("topic", "   ");
    formData.set(`attendance:${studentId}`, "");

    expect(parseLessonJournalFormData(formData)).toEqual({
      success: true,
      data: {
        slotId,
        version: 2,
        topic: null,
        attendance: [{ studentId, status: null }],
      },
    });
  });

  it("accepts a short topic and a known attendance status", () => {
    const formData = new FormData();
    formData.set("slotId", slotId);
    formData.set("version", "1");
    formData.set("topic", "Past Simple — pytania");
    formData.set(`attendance:${studentId}`, "PRESENT");

    const result = parseLessonJournalFormData(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.topic).toBe("Past Simple — pytania");
      expect(result.data.attendance[0]?.status).toBe("PRESENT");
    }
  });

  it("rejects an unknown status and a topic longer than 240 characters", () => {
    const invalidStatus = new FormData();
    invalidStatus.set("slotId", slotId);
    invalidStatus.set("version", "1");
    invalidStatus.set("topic", "Lesson");
    invalidStatus.set(`attendance:${studentId}`, "UNKNOWN");

    const longTopic = new FormData();
    longTopic.set("slotId", slotId);
    longTopic.set("version", "1");
    longTopic.set("topic", "a".repeat(241));

    expect(parseLessonJournalFormData(invalidStatus).success).toBe(false);
    expect(parseLessonJournalFormData(longTopic).success).toBe(false);
  });
});
