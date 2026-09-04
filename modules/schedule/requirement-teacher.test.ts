import { describe, expect, it } from "vitest";

import { resolveRequirementTeacherId } from "./requirement-teacher";

describe("schedule requirement teacher resolution", () => {
  const teachers = [
    { teacherId: "teacher-secondary", isPrimary: false },
    { teacherId: "teacher-primary", isPrimary: true },
  ];

  it("keeps an explicit active teacher override", () => {
    expect(resolveRequirementTeacherId("teacher-secondary", teachers)).toBe("teacher-secondary");
  });

  it("uses the group's primary teacher when a legacy requirement is empty", () => {
    expect(resolveRequirementTeacherId(null, teachers)).toBe("teacher-primary");
  });

  it("repairs a stale override by falling back to the current primary teacher", () => {
    expect(resolveRequirementTeacherId("teacher-removed", teachers)).toBe("teacher-primary");
  });
});
