import { describe, expect, it } from "vitest";

import { progressObservationSchema } from "./schema";

const valid = {
  studentId: "00000000-0000-4000-8000-000000000001",
  speaking: 3,
  listening: 3,
  reading: 3,
  writing: 3,
  vocabulary: 3,
  grammar: 3,
};

describe("progress observation schema", () => {
  it("accepts pedagogical scores from 1 to 5", () => {
    expect(progressObservationSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects values outside the transparent scale", () => {
    expect(progressObservationSchema.safeParse({ ...valid, speaking: 6 }).success).toBe(false);
  });
});
