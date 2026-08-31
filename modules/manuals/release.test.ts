import { describe, expect, it } from "vitest";

import { canDownloadManual, manualAudienceForRole, manualRelease } from "./release";

describe("manual access", () => {
  it("maps every account to its own manual", () => {
    expect(manualAudienceForRole("DIRECTOR")).toBe("director");
    expect(manualAudienceForRole("TEACHER")).toBe("teacher");
    expect(manualAudienceForRole("PARENT")).toBe("parent");
    expect(manualAudienceForRole("STUDENT")).toBe("student");
  });

  it("keeps role manuals separated while the owner can download the complete set", () => {
    expect(canDownloadManual("SYSTEM_OWNER", "owner")).toBe(true);
    expect(canDownloadManual("SYSTEM_OWNER", "student")).toBe(true);
    expect(canDownloadManual("DIRECTOR", "director")).toBe(true);
    expect(canDownloadManual("DIRECTOR", "teacher")).toBe(false);
    expect(canDownloadManual("DIRECTOR", "owner")).toBe(false);
    expect(canDownloadManual("TEACHER", "owner")).toBe(false);
    expect(manualRelease.schoolChanges.length).toBeGreaterThan(0);
  });
});
