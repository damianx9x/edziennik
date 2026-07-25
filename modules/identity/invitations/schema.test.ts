import { describe, expect, it } from "vitest";

import {
  acceptInvitationSchema,
  createInvitationSchema,
  getInvitationAvailability,
} from "./schema";

describe("invitation validation", () => {
  it("accepts only supported roles and a normalized email", () => {
    const parsed = createInvitationSchema.parse({
      email: " Rodzic@Example.com ",
      name: "Rodzic Demo",
      role: "PARENT",
    });

    expect(parsed.email).toBe("rodzic@example.com");
    expect(
      createInvitationSchema.safeParse({
        email: "x@example.com",
        name: "Test",
        role: "ADMIN",
      }).success,
    ).toBe(false);
  });

  it("requires matching, long passwords", () => {
    const base = {
      token: "a".repeat(43),
      name: "Rodzic Demo",
      password: "bardzo-dlugie-haslo",
      passwordConfirmation: "bardzo-dlugie-haslo",
    };

    expect(acceptInvitationSchema.safeParse(base).success).toBe(true);
    expect(
      acceptInvitationSchema.safeParse({
        ...base,
        passwordConfirmation: "inne-bardzo-dlugie-haslo",
      }).success,
    ).toBe(false);
  });

  it("classifies one-use invitation states", () => {
    const now = new Date("2026-07-25T10:00:00Z");
    const future = new Date("2026-07-26T10:00:00Z");
    const past = new Date("2026-07-24T10:00:00Z");

    expect(
      getInvitationAvailability({
        acceptedAt: null,
        revokedAt: null,
        expiresAt: future,
        now,
      }),
    ).toBe("ready");
    expect(
      getInvitationAvailability({
        acceptedAt: now,
        revokedAt: null,
        expiresAt: future,
        now,
      }),
    ).toBe("accepted");
    expect(
      getInvitationAvailability({
        acceptedAt: null,
        revokedAt: now,
        expiresAt: future,
        now,
      }),
    ).toBe("revoked");
    expect(
      getInvitationAvailability({
        acceptedAt: null,
        revokedAt: null,
        expiresAt: past,
        now,
      }),
    ).toBe("expired");
  });
});
