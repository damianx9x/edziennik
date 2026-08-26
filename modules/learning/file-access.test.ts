import { describe, expect, it } from "vitest";

import { canViewLearningStoredFile } from "./file-access";

const base = {
  hasAccessibleGroup: true,
  containsHomeworkSubmission: true,
  isOwnSubmission: false,
  isLinkedChildSubmission: false,
} as const;

describe("private learning file access", () => {
  it("allows a student to open only their own submitted file", () => {
    expect(canViewLearningStoredFile({ ...base, role: "STUDENT", isOwnSubmission: true })).toBe(true);
    expect(canViewLearningStoredFile({ ...base, role: "STUDENT" })).toBe(false);
  });

  it("allows a parent only for a linked child submission", () => {
    expect(canViewLearningStoredFile({ ...base, role: "PARENT", isLinkedChildSubmission: true })).toBe(true);
    expect(canViewLearningStoredFile({ ...base, role: "PARENT" })).toBe(false);
  });

  it("allows the system owner but denies unrelated groups", () => {
    expect(canViewLearningStoredFile({ ...base, role: "SYSTEM_OWNER" })).toBe(true);
    expect(canViewLearningStoredFile({ ...base, role: "DIRECTOR", hasAccessibleGroup: false })).toBe(false);
  });
});
