import { describe, expect, it } from "vitest";

import { getPublicPresentationMode } from "./public-mode";

describe("public presentation mode", () => {
  it("fails closed to the neutral product presentation", () => {
    expect(getPublicPresentationMode(undefined)).toBe("PRODUCT");
    expect(getPublicPresentationMode("anything-else")).toBe("PRODUCT");
    expect(getPublicPresentationMode(" PRODUCT ")).toBe("PRODUCT");
    expect(getPublicPresentationMode(" SCHOOL ")).toBe("SCHOOL");
  });
});
