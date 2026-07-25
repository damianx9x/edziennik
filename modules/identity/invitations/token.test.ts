import { describe, expect, it } from "vitest";

import {
  createInvitationToken,
  hashInvitationToken,
  maskEmail,
  normalizeEmail,
} from "./token";

describe("invitation tokens", () => {
  it("generates opaque tokens and stores only deterministic hashes", () => {
    const first = createInvitationToken();
    const second = createInvitationToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(hashInvitationToken(first)).toHaveLength(64);
    expect(hashInvitationToken(first)).toBe(hashInvitationToken(first));
    expect(hashInvitationToken(first)).not.toContain(first);
  });

  it("normalizes and masks an invited email", () => {
    expect(normalizeEmail("  Rodzic.Demo@Example.COM ")).toBe(
      "rodzic.demo@example.com",
    );
    expect(maskEmail("rodzic.demo@example.com")).toMatch(
      /^ro•+@example\.com$/,
    );
  });
});
