import { describe, expect, it } from "vitest";

import {
  configurableModuleKeys,
  defaultModuleAccessPolicy,
  moduleCatalog,
  parseModuleAccessPolicy,
} from "./catalog";

describe("role module access policy", () => {
  it("starts with every supported pilot module enabled", () => {
    for (const key of configurableModuleKeys) {
      for (const role of moduleCatalog[key].supportedRoles) {
        expect(defaultModuleAccessPolicy[key][role]).toBe(true);
      }
    }
  });

  it("does not expose unsupported role and module combinations", () => {
    expect(defaultModuleAccessPolicy.contracts.STUDENT).toBe(false);
    expect(defaultModuleAccessPolicy.statistics.PARENT).toBe(false);
    expect(defaultModuleAccessPolicy.invitations.TEACHER).toBe(false);
  });

  it("merges an incomplete stored policy with safe defaults", () => {
    const policy = parseModuleAccessPolicy({ contracts: { PARENT: false } });
    expect(policy.contracts.PARENT).toBe(false);
    expect(policy.contracts.DIRECTOR).toBe(true);
    expect(policy.messages.TEACHER).toBe(true);
  });

  it("preserves a complete owner configuration", () => {
    const configured = structuredClone(defaultModuleAccessPolicy);
    configured.contracts.PARENT = false;
    expect(parseModuleAccessPolicy(configured).contracts.PARENT).toBe(false);
  });
});
