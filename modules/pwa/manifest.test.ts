import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import manifest from "@/app/manifest";

describe("PWA manifest", () => {
  it("opens the authenticated panel as an installable standalone app", () => {
    const value = manifest();
    expect(value.start_url).toBe("/panel");
    expect(value.display).toBe("standalone");
    expect(value.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192", purpose: "maskable" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]));
  });

  it("registers a network-only worker that does not cache private responses", () => {
    const worker = readFileSync("public/sw.js", "utf8");
    expect(worker).toContain("clients.claim");
    expect(worker).not.toContain("cache.put");
    expect(worker).not.toContain("respondWith");
  });
});
