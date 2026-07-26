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
});
