import { describe, expect, it } from "vitest";

import { isSchoolStaffRole } from "./staff-role";

describe("school staff session boundary", () => {
  it("allows only director and teacher through the shared school-staff gate", () => {
    expect(isSchoolStaffRole("DIRECTOR")).toBe(true);
    expect(isSchoolStaffRole("TEACHER")).toBe(true);
    expect(isSchoolStaffRole("SYSTEM_OWNER")).toBe(false);
    expect(isSchoolStaffRole("PARENT")).toBe(false);
    expect(isSchoolStaffRole("STUDENT")).toBe(false);
  });
});
