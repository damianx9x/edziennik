import { describe, expect, it, vi } from "vitest";

import { checkApplicationHealth } from "./health";

describe("application health", () => {
  it("reports a healthy application only after the database responds", async () => {
    const probe = vi.fn().mockResolvedValue([{ "?column?": 1 }]);

    await expect(checkApplicationHealth(probe)).resolves.toEqual({
      status: "ok",
    });
    expect(probe).toHaveBeenCalledOnce();
  });

  it("returns a sanitized degraded state when the database fails", async () => {
    const probe = vi
      .fn()
      .mockRejectedValue(new Error("postgresql://secret@localhost/database"));

    await expect(checkApplicationHealth(probe)).resolves.toEqual({
      status: "degraded",
    });
  });
});
