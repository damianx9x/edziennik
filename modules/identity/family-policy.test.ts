import { describe, expect, it } from "vitest";
import { can, type Actor } from "@/modules/access-control/can";
import { childPasswordSchema, childRequestSchema, childLogin } from "./family-schema";
import { normalizeLoginIdentifier } from "./auth/system-owner";

describe("parent-managed child identity", () => {
  const parent: Actor = { id: "parent", schoolId: "school", role: "PARENT" };
  it("requires a trusted relation and the same school", () => {
    expect(can(parent, "manage:child-account", { schoolId: "school", parentIds: ["parent"] })).toBe(true);
    expect(can(parent, "manage:child-account", { schoolId: "other", parentIds: ["parent"] })).toBe(false);
    expect(can(parent, "manage:child-account", { schoolId: "school", parentIds: ["other"] })).toBe(false);
    expect(can(parent, "manage:child-account", { schoolId: "school" })).toBe(false);
  });
  it("does not grant children or teachers parental control", () => {
    for (const role of ["TEACHER", "STUDENT"] as const) expect(can({ ...parent, role }, "manage:child-account", { schoolId: "school", parentIds: [parent.id] })).toBe(false);
  });
  it("validates password length and matching confirmation", () => {
    const input = { childId: "22222222-2222-4222-8222-222222222222", password: "Synthetic-test-123", repeatPassword: "Synthetic-test-123" };
    expect(childPasswordSchema.safeParse(input).success).toBe(true);
    expect(childPasswordSchema.safeParse({ ...input, password: "Kotki123", repeatPassword: "Kotki123" }).success).toBe(true);
    expect(childPasswordSchema.safeParse({ ...input, password: "Kotki12", repeatPassword: "Kotki12" }).success).toBe(false);
    expect(childPasswordSchema.safeParse({ ...input, repeatPassword: "other" }).success).toBe(false);
    expect(childPasswordSchema.safeParse({ ...input, password: "short", repeatPassword: "short" }).success).toBe(false);
  });
  it("does not accept role or existing child identifiers from a request", () => {
    expect(childRequestSchema.parse({ kind: "CHILD_ENROLLMENT", name: "Test Child", role: "SYSTEM_OWNER", childId: "victim" })).toEqual({ kind: "CHILD_ENROLLMENT", name: "Test Child" });
  });
  it("normalizes only generated child identifiers without changing ordinary email", () => {
    const email = "uczen-0123456789abcdef@children.kla.invalid";
    expect(normalizeLoginIdentifier(childLogin(email))).toBe(email);
    expect(normalizeLoginIdentifier("parent@example.org")).toBe("parent@example.org");
    expect(normalizeLoginIdentifier("uczen-arbitrary")).toBe("uczen-arbitrary");
  });
});
