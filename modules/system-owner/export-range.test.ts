import { describe, expect, it } from "vitest";

import { parseExportRange } from "./export-range";

describe("parseExportRange", () => {
  it("parses a bounded range", () => expect(parseExportRange("bytes=10-19", 100)).toEqual({ start: 10, end: 19 }));
  it("clips an oversized end", () => expect(parseExportRange("bytes=90-999", 100)).toEqual({ start: 90, end: 99 }));
  it("parses an open range", () => expect(parseExportRange("bytes=40-", 100)).toEqual({ start: 40, end: 99 }));
  it("parses a suffix range", () => expect(parseExportRange("bytes=-20", 100)).toEqual({ start: 80, end: 99 }));
  it("rejects multiple and invalid ranges", () => {
    expect(parseExportRange("bytes=0-1,3-4", 100)).toBe("invalid");
    expect(parseExportRange("bytes=100-", 100)).toBe("invalid");
    expect(parseExportRange("bytes=-0", 100)).toBe("invalid");
  });
});
