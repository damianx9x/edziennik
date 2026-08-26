import { describe, expect, it } from "vitest";

import { isSchoolStaffRole } from "./staff-role";

describe("school staff session boundary", () => {
  it("allows the owner, director and teacher through the shared school-staff gate", () => {
    expect(isSchoolStaffRole("DIRECTOR")).toBe(true);
    expect(isSchoolStaffRole("TEACHER")).toBe(true);
    expect(isSchoolStaffRole("SYSTEM_OWNER")).toBe(true);
    expect(isSchoolStaffRole("PARENT")).toBe(false);
    expect(isSchoolStaffRole("STUDENT")).toBe(false);
  });
});
