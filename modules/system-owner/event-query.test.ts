import { describe, expect, it } from "vitest";

import { safeEventRole, safeEventSchool } from "./event-query";

describe("owner event query", () => {
  it("accepts only known roles", () => {
    expect(safeEventRole("TEACHER")).toBe("TEACHER");
    expect(safeEventRole("garbage")).toBe("");
  });

  it("accepts only a school visible in the selector", () => {
    const schools = new Set(["9e54b7d1-cf8b-44d3-bb68-1e8962c2d677"]);
    expect(safeEventSchool("not-a-uuid", schools)).toBe("");
    expect(
      safeEventSchool("9e54b7d1-cf8b-44d3-bb68-1e8962c2d677", schools),
    ).toBe("9e54b7d1-cf8b-44d3-bb68-1e8962c2d677");
    expect(safeEventSchool("platform", schools)).toBe("");
    expect(safeEventSchool("platform", schools, true)).toBe("platform");
  });
});
