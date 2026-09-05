import { describe, expect, it } from "vitest";
import { restartPolicySchema } from "./restart-policy";

describe("restart policy", () => {
  it("accepts only bounded times and explicit confirmation", () => {
    expect(restartPolicySchema.parse({ frequency: "weekly", hour: "3", minute: "30", confirmed: "yes" })).toEqual({ frequency: "weekly", hour: 3, minute: 30, confirmed: "yes" });
  });
  it.each([
    { frequency: "hourly", hour: 3, minute: 30, confirmed: "yes" },
    { frequency: "daily", hour: 24, minute: 30, confirmed: "yes" },
    { frequency: "daily", hour: 3, minute: -1, confirmed: "yes" },
    { frequency: "daily", hour: 3, minute: 60, confirmed: "yes" },
    { frequency: "daily", hour: "3; reboot", minute: 30, confirmed: "yes" },
    { frequency: "daily", hour: 3, minute: 30 },
  ])("rejects unsafe or incomplete policy %j", (data) => {
    expect(restartPolicySchema.safeParse(data).success).toBe(false);
  });
});
