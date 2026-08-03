import { describe, expect, it, vi } from "vitest";

import {
  discardReadyScheduleGenerations,
  lockScheduleResources,
} from "./resource-lock";

describe("schedule resource coordination", () => {
  it("uses a transaction-scoped advisory lock keyed by school", async () => {
    const executeRaw = vi.fn().mockResolvedValue(1);
    const transaction = {
      $executeRaw: executeRaw,
    } as unknown as Parameters<typeof lockScheduleResources>[0];

    await lockScheduleResources(transaction, "school-a");

    expect(executeRaw).toHaveBeenCalledTimes(1);
    const [template, schoolId] = executeRaw.mock.calls[0] ?? [];
    expect(Array.from(template as TemplateStringsArray).join("?")).toContain(
      "pg_advisory_xact_lock(hashtext(?))",
    );
    expect(schoolId).toBe("school-a");
  });

  it("discards only ready proposals for the selected school", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 3 });
    const transaction = {
      scheduleGeneration: { updateMany },
    } as unknown as Parameters<typeof discardReadyScheduleGenerations>[0];

    await expect(
      discardReadyScheduleGenerations(transaction, "school-a"),
    ).resolves.toBe(3);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        schoolId: "school-a",
        status: "READY",
      },
      data: {
        status: "DISCARDED",
      },
    });
  });
});
