import { describe, expect, it } from "vitest";

import { createRecordOnlyEmail } from "./record-email";

describe("record-only email", () => {
  it("is stable and does not expose the student identifier", () => {
    const email = createRecordOnlyEmail(
      "d694d0a5-1786-4b23-8d1f-4ba66e74a2c0",
      "STU-001-secret",
    );

    expect(email).toBe(
      createRecordOnlyEmail(
        "d694d0a5-1786-4b23-8d1f-4ba66e74a2c0",
        "STU-001-secret",
      ),
    );
    expect(email).not.toContain("STU-001");
    expect(email).toMatch(/^record\.[0-9a-f]{28}@invalid\.example$/);
  });
});
