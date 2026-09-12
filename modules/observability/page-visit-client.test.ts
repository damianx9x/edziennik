import { describe, it, expect } from "vitest";
import { pageVisitClientScope } from "./page-visits";

describe("visit isolation", () => {
  it("does not deduplicate different anonymous clients together", () => {
    expect(pageVisitClientScope(null, "client-a")).not.toEqual(pageVisitClientScope(null, "client-b"));
    expect(pageVisitClientScope(null, "client-a")).toEqual({ userId: null, clientHash: "client-a" });
  });
  it("deduplicates an authenticated account across changing networks", () => {
    expect(pageVisitClientScope("user-a", "network-a")).toEqual(pageVisitClientScope("user-a", "network-b"));
    expect(pageVisitClientScope("user-a", null)).not.toEqual(pageVisitClientScope("user-b", null));
  });
});
