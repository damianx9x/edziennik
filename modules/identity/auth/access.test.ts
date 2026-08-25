import { describe, expect, it } from "vitest";

import { identityRoles } from "./access";

describe("Better Auth admin permissions", () => {
  it("does not expose global account administration to a school director", () => {
    expect(identityRoles.DIRECTOR.statements.user).toEqual([]);
    expect(identityRoles.DIRECTOR.statements.session).toEqual([]);
  });

  it("does not expose Better Auth administration to any interactive role", () => {
    for (const role of [
      "SYSTEM_OWNER",
      "DIRECTOR",
      "TEACHER",
      "PARENT",
      "STUDENT",
    ] as const) {
      expect(identityRoles[role].statements.user).toEqual([]);
      expect(identityRoles[role].statements.session).toEqual([]);
    }

    expect(
      identityRoles.SYSTEM_OWNER.authorize({ user: ["list"] }),
    ).toMatchObject({ success: false });
    expect(
      identityRoles.SYSTEM_OWNER.authorize({ user: ["set-role"] }),
    ).toMatchObject({ success: false });
    expect(
      identityRoles.SYSTEM_OWNER.authorize({ session: ["revoke"] }),
    ).toMatchObject({ success: false });
  });
});
