import { describe, expect, it } from "vitest";

import { generateTemporaryPassword } from "./temporary-password";

describe("temporary password", () => {
  it("creates a long password with all required character groups", () => {
    const password = generateTemporaryPassword();

    expect(password.length).toBeGreaterThanOrEqual(24);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[^a-zA-Z0-9]/);
  });

  it("does not repeat the same generated value", () => {
    expect(generateTemporaryPassword()).not.toBe(generateTemporaryPassword());
  });
});
