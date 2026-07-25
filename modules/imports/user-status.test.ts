import { describe, expect, it } from "vitest";

import { statusForImportedExistingUser } from "./user-status";

describe("imported user status", () => {
  it.each(["INVITED", "ACTIVE", "SUSPENDED"] as const)(
    "preserves %s for an existing account",
    (status) => {
      expect(statusForImportedExistingUser(status)).toBe(status);
    },
  );

  it("restores an archived record as invitation-only", () => {
    expect(statusForImportedExistingUser("ARCHIVED")).toBe("INVITED");
  });
});
