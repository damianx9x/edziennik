import { describe, expect, it } from "vitest";

import {
  acceptInvitationSchema,
  canReuseArchivedAccount,
  createInvitationSchema,
  createRoleQrInvitationSchema,
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
    expect(
      createInvitationSchema.safeParse({
        email: "owner@example.com",
        name: "Właściciel",
        role: "SYSTEM_OWNER",
      }).success,
    ).toBe(false);
  });

  it("requires matching, long passwords", () => {
    const base = {
      token: "a".repeat(43),
      firstName: "Anna",
      lastName: "Kowalska",
      email: "anna@example.com",
      phone: "+48 500 000 000",
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

  it("binds a QR invitation to a supported role and validity", () => {
    expect(
      createRoleQrInvitationSchema.safeParse({
        role: "TEACHER",
        validity: "1h",
      }).success,
    ).toBe(true);
    expect(
      createRoleQrInvitationSchema.safeParse({
        role: "ADMIN",
        validity: "forever",
      }).success,
    ).toBe(false);
    expect(
      createRoleQrInvitationSchema.safeParse({
        role: "SYSTEM_OWNER",
        validity: "1h",
      }).success,
    ).toBe(false);
  });

  it("reuses only an archived account from the same school", () => {
    const archived = {
      schoolId: "school-kla",
      status: "ARCHIVED",
      archivedAt: new Date(),
    };
    expect(canReuseArchivedAccount(archived, "school-kla")).toBe(true);
    expect(canReuseArchivedAccount(archived, "school-other")).toBe(false);
    expect(
      canReuseArchivedAccount(
        { ...archived, status: "ACTIVE", archivedAt: null },
        "school-kla",
      ),
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
