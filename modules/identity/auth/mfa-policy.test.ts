import { describe, expect, it } from "vitest";

import { isMfaRequiredForRole } from "./mfa-policy";

describe("MFA policy", () => {
  it("always requires MFA for the system owner", () => {
    expect(isMfaRequiredForRole("SYSTEM_OWNER", false)).toBe(true);
  });

  it("allows the pilot to disable mandatory director MFA", () => {
    expect(isMfaRequiredForRole("DIRECTOR", false)).toBe(false);
    expect(isMfaRequiredForRole("DIRECTOR", true)).toBe(true);
  });

  it("does not require MFA for standard roles", () => {
    expect(isMfaRequiredForRole("TEACHER", true)).toBe(false);
    expect(isMfaRequiredForRole("PARENT", true)).toBe(false);
    expect(isMfaRequiredForRole("STUDENT", true)).toBe(false);
  });
});
