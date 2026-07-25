import { describe, expect, it } from "vitest";

import { demoGroups, demoStudentCount } from "./groups";

describe("demoGroups", () => {
  it("contains the eight approved group names", () => {
    expect(demoGroups.map((group) => group.name)).toEqual([
      "MONACO",
      "TORONTO",
      "ORLANDO",
      "OXFORD",
      "BARCELONA",
      "LONDON",
      "VENICE",
      "MIAMI",
    ]);
  });

  it("keeps every test group between two and eight students", () => {
    expect(
      demoGroups.every(
        (group) => group.studentCount >= 2 && group.studentCount <= 8,
      ),
    ).toBe(true);
  });

  it("contains only unique identifiers", () => {
    expect(new Set(demoGroups.map((group) => group.id)).size).toBe(
      demoGroups.length,
    );
  });

  it("calculates the expected synthetic student total", () => {
    expect(demoStudentCount).toBe(35);
  });

  it("contains only English groups", () => {
    expect(demoGroups.every((group) => group.subject === "angielski")).toBe(
      true,
    );
  });
});
