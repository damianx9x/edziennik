import { describe, expect, it } from "vitest";

import { detectLearningFileType } from "./file-validation";

describe("learning file validation", () => {
  it("detects supported files from bytes instead of trusting a browser MIME type", () => {
    expect(detectLearningFileType(new TextEncoder().encode("%PDF-1.7"))).toBe("application/pdf");
    expect(detectLearningFileType(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
  });

  it("rejects an executable renamed as a document", () => {
    expect(detectLearningFileType(new TextEncoder().encode("MZ executable"))).toBeNull();
  });
});
