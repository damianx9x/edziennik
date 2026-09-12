import { describe, expect, it } from "vitest";
import { childLoginBase } from "./child-login";
import { normalizeLoginIdentifier } from "./auth/system-owner";

describe("readable child logins", () => {
  it("removes Polish accents, spaces and punctuation", () => {
    expect(childLoginBase("Łucja Żółć-Kowalska")).toBe("lucjazolckowalska");
    expect(childLoginBase("Anna Kowalska")).toBe("annakowalska");
  });
  it("avoids reserved aliases and supports numbered duplicates", () => {
    expect(childLoginBase("Kinga")).toBe("uczenkinga");
    expect(normalizeLoginIdentifier(" AnnaKowalska2 ")).toBe("annakowalska2@children.kla.invalid");
    expect(normalizeLoginIdentifier("bog")).toBe("bog@owner.kla.internal");
  });
});
