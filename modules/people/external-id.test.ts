import { describe, expect, it } from "vitest";

import {
  buildStudentExternalIdBase,
  nextAvailableExternalId,
} from "./external-id";

describe("student external identifiers", () => {
  it("builds the identifier from the first name initial and surname", () => {
    expect(buildStudentExternalIdBase("Jan", "Kowalski")).toBe("JKOW");
    expect(buildStudentExternalIdBase("Łukasz", "Żółć")).toBe("LZOL");
  });

  it("adds a stable numeric suffix when the identifier is already used", () => {
    expect(nextAvailableExternalId("JKOW", ["JKOW", "JKOW2", null])).toBe("JKOW3");
  });
});
