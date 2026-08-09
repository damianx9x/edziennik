import { describe, expect, it } from "vitest";

import {
  normalizeLoginIdentifier,
  SYSTEM_OWNER_EMAIL,
} from "./system-owner";

describe("system owner login", () => {
  it("maps the private owner alias to its technical account", () => {
    expect(normalizeLoginIdentifier(" BOG ")).toBe(SYSTEM_OWNER_EMAIL);
  });

  it("normalizes standard e-mail identifiers", () => {
    expect(normalizeLoginIdentifier(" Parent@Example.com ")).toBe(
      "parent@example.com",
    );
  });

  it.each([
    ["dyrektor", "dyrektor.demo@invalid.example"],
    ["wykladowca", "wykladowca.demo@invalid.example"],
    ["rodzic", "rodzic.demo@invalid.example"],
    ["uczen", "uczen.panel.demo@invalid.example"],
  ])("maps the demo alias %s", (alias, email) => {
    expect(normalizeLoginIdentifier(alias)).toBe(email);
  });
});
