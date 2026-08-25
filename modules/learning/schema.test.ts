import { describe, expect, it } from "vitest";

import { homeworkAssignmentSchema, learningMaterialSchema } from "./schema";

const groupId = "00000000-0000-4000-8000-000000000001";

describe("learning schemas", () => {
  it("accepts an HTTPS learning link", () => {
    expect(learningMaterialSchema.safeParse({ groupId, title: "Powtórka", externalUrl: "https://example.org/a" }).success).toBe(true);
  });

  it("rejects an unencrypted external link", () => {
    expect(learningMaterialSchema.safeParse({ groupId, title: "Powtórka", externalUrl: "http://example.org/a" }).success).toBe(false);
  });

  it("validates concise homework data", () => {
    expect(homeworkAssignmentSchema.safeParse({ groupId, title: "Unit 3", instructions: "Zrób ćwiczenia 1-3." }).success).toBe(true);
  });
});
