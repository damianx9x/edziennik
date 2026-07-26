import { describe, expect, it } from "vitest";

import { getRoleHome, getSafeReturnPath } from "./redirects";

describe("identity redirects", () => {
  it("maps every role to its own panel", () => {
    expect(getRoleHome("SYSTEM_OWNER")).toBe("/panel/bog");
    expect(getRoleHome("DIRECTOR")).toBe("/panel/szkola");
    expect(getRoleHome("TEACHER")).toBe("/panel/szkola");
    expect(getRoleHome("PARENT")).toBe("/panel/rodzic");
    expect(getRoleHome("STUDENT")).toBe("/panel/uczen");
  });

  it("accepts only same-site relative return paths", () => {
    expect(getSafeReturnPath("/panel/rodzic?widok=plan", "/panel")).toBe(
      "/panel/rodzic?widok=plan",
    );
    expect(getSafeReturnPath("//evil.example", "/panel")).toBe("/panel");
    expect(getSafeReturnPath("https://evil.example", "/panel")).toBe(
      "/panel",
    );
    expect(getSafeReturnPath("javascript:alert(1)", "/panel")).toBe("/panel");
  });
});
