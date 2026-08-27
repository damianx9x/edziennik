import { describe, expect, it } from "vitest";

import {
  acceptInvitationSchema,
  createInvitationSchema,
  createRoleQrInvitationSchema,
  doesInvitationVerifyEmail,
  getExistingInvitationAccountReuse,
  getInvitationAvailability,
  isSyntheticDemoEmail,
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
        usageLimit: "once",
      }).success,
    ).toBe(true);
    expect(
      createRoleQrInvitationSchema.safeParse({
        role: "ADMIN",
        validity: "forever",
        usageLimit: "once",
      }).success,
    ).toBe(false);
    expect(
      createRoleQrInvitationSchema.safeParse({
        role: "SYSTEM_OWNER",
        validity: "1h",
        usageLimit: "unlimited",
      }).success,
    ).toBe(false);
  });

  it("reuses an archived account only for a matching e-mail invitation", () => {
    const archived = {
      schoolId: "school-kla",
      role: "PARENT",
      status: "ARCHIVED",
      archivedAt: new Date(),
      accounts: [{ id: "credential-account" }],
    };
    expect(
      getExistingInvitationAccountReuse(archived, {
        schoolId: "school-kla",
        role: "PARENT",
        kind: "EMAIL",
      }),
    ).toBe("ARCHIVED_ACCOUNT");
    expect(
      getExistingInvitationAccountReuse(archived, {
        schoolId: "school-other",
        role: "PARENT",
        kind: "EMAIL",
      }),
    ).toBeNull();
    expect(
      getExistingInvitationAccountReuse(archived, {
        schoolId: "school-kla",
        role: "TEACHER",
        kind: "EMAIL",
      }),
    ).toBeNull();
    expect(
      getExistingInvitationAccountReuse(archived, {
        schoolId: "school-kla",
        role: "PARENT",
        kind: "ROLE_QR",
      }),
    ).toBeNull();
  });

  it("activates only an account-free invited record with the same role", () => {
    const invited = {
      schoolId: "school-kla",
      role: "STUDENT",
      status: "INVITED",
      archivedAt: null,
      accounts: [],
    };

    expect(
      getExistingInvitationAccountReuse(invited, {
        schoolId: "school-kla",
        role: "STUDENT",
        kind: "EMAIL",
      }),
    ).toBe("INVITED_RECORD");
    expect(
      getExistingInvitationAccountReuse(
        { ...invited, accounts: [{ id: "credential-account" }] },
        {
          schoolId: "school-kla",
          role: "STUDENT",
          kind: "EMAIL",
        },
      ),
    ).toBeNull();
    expect(
      getExistingInvitationAccountReuse(
        { ...invited, status: "ACTIVE" },
        {
          schoolId: "school-kla",
          role: "STUDENT",
          kind: "EMAIL",
        },
      ),
    ).toBeNull();
  });

  it("treats only a link sent to the mailbox as e-mail verification", () => {
    expect(doesInvitationVerifyEmail("EMAIL")).toBe(true);
    expect(doesInvitationVerifyEmail("ROLE_QR")).toBe(false);
  });

  it("recognizes only reserved synthetic demo addresses", () => {
    expect(isSyntheticDemoEmail("nowy.rodzic@invalid.example")).toBe(true);
    expect(isSyntheticDemoEmail("NOWY@INVALID.EXAMPLE")).toBe(true);
    expect(isSyntheticDemoEmail("rodzic@example.com")).toBe(false);
    expect(isSyntheticDemoEmail("invalid.example@attacker.test")).toBe(false);
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
