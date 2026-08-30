import { describe, expect, it } from "vitest";

import { resolvePageVisitSchoolId } from "./page-visit-scope";

describe("page visit tenant scope", () => {
  it("stores neutral product traffic in the platform stream", () => {
    expect(resolvePageVisitSchoolId({ publicMode: "PRODUCT" })).toBeNull();
  });

  it("keeps authenticated visits in the user's school", () => {
    expect(
      resolvePageVisitSchoolId({
        sessionSchoolId: "school-id",
        publicMode: "PRODUCT",
      }),
    ).toBe("school-id");
  });

  it("requires an explicit school for the school presentation", () => {
    expect(resolvePageVisitSchoolId({ publicMode: "SCHOOL" })).toBeUndefined();
    expect(
      resolvePageVisitSchoolId({
        publicMode: "SCHOOL",
        publicSchoolId: "public-school-id",
      }),
    ).toBe("public-school-id");
  });
});
