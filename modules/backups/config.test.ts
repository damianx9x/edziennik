import { describe, expect, it } from "vitest";

import { backupRequirements } from "./config";

describe("backup destination requirements", () => {
  it("requires a host fingerprint for encrypted SFTP", () => {
    expect(backupRequirements("SFTP").join(" ")).toContain("odcisk klucza");
  });

  it("warns that a local folder needs another copy", () => {
    expect(backupRequirements("LOCAL_FOLDER").join(" ")).toContain("drugie miejsce");
  });
});
