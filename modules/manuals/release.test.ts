import { describe, expect, it } from "vitest";

import { canDownloadManual, manualRelease } from "./release";

describe("manual access", () => {
  it("allows every active role to download the school manual", () => {
    for (const role of ["SYSTEM_OWNER", "DIRECTOR", "TEACHER", "PARENT", "STUDENT"] as const) {
      expect(canDownloadManual(role, "school")).toBe(true);
    }
  });

  it("keeps the owner manual exclusive to the system owner", () => {
    expect(canDownloadManual("SYSTEM_OWNER", "owner")).toBe(true);
    expect(canDownloadManual("DIRECTOR", "owner")).toBe(false);
    expect(canDownloadManual("TEACHER", "owner")).toBe(false);
    expect(manualRelease.schoolChanges.length).toBeGreaterThan(0);
  });
});
