import { describe, expect, it } from "vitest";

import { canRequestPasswordReset } from "./password-reset-policy";

describe("canRequestPasswordReset", () => {
  it("allows the system owner to reset every school account", () => {
    expect(canRequestPasswordReset("SYSTEM_OWNER", "SYSTEM_OWNER")).toBe(true);
    expect(canRequestPasswordReset("SYSTEM_OWNER", "DIRECTOR")).toBe(true);
    expect(canRequestPasswordReset("SYSTEM_OWNER", "PARENT")).toBe(true);
  });

  it("allows a director to reset ordinary accounts", () => {
    expect(canRequestPasswordReset("DIRECTOR", "TEACHER")).toBe(true);
    expect(canRequestPasswordReset("DIRECTOR", "PARENT")).toBe(true);
    expect(canRequestPasswordReset("DIRECTOR", "STUDENT")).toBe(true);
  });

  it("prevents a director from taking over the system owner account", () => {
    expect(canRequestPasswordReset("DIRECTOR", "SYSTEM_OWNER")).toBe(false);
    expect(canRequestPasswordReset("TEACHER", "PARENT")).toBe(false);
  });
});
