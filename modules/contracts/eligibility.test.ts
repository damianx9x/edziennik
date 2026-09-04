import { describe, expect, it } from "vitest";

import { isContractEligiblePersonStatus } from "./eligibility";

describe("contract participant eligibility", () => {
  it("allows linked students before their login is activated", () => {
    expect(isContractEligiblePersonStatus("ACTIVE")).toBe(true);
    expect(isContractEligiblePersonStatus("INVITED")).toBe(true);
  });

  it("rejects suspended and archived participants", () => {
    expect(isContractEligiblePersonStatus("SUSPENDED")).toBe(false);
    expect(isContractEligiblePersonStatus("ARCHIVED")).toBe(false);
  });
});
