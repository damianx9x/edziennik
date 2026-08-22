import { describe, expect, it } from "vitest";

import {
  relationshipUpdateSchema,
  studentAvailabilityUpdateSchema,
} from "./relationship-schema";

const id = "10000000-0000-4000-8000-000000000001";

describe("relationshipUpdateSchema", () => {
  it("accepts replacing a student's groups", () => {
    expect(relationshipUpdateSchema.safeParse({
      entityId: id,
      relationKind: "STUDENT_GROUPS",
      selectedIds: ["10000000-0000-4000-8000-000000000002"],
    }).success).toBe(true);
  });

  it("rejects unknown relationship kinds", () => {
    expect(relationshipUpdateSchema.safeParse({
      entityId: id,
      relationKind: "STUDENT_ROOM",
      selectedIds: [],
    }).success).toBe(false);
  });
});

describe("studentAvailabilityUpdateSchema", () => {
  it("accepts different hours on different days", () => {
    expect(studentAvailabilityUpdateSchema.safeParse({
      studentId: id,
      windows: [
        { weekday: 1, startMinute: 900, endMinute: 1080 },
        { weekday: 3, startMinute: 960, endMinute: 1200 },
      ],
    }).success).toBe(true);
  });

  it("rejects an inverted time range", () => {
    expect(studentAvailabilityUpdateSchema.safeParse({
      studentId: id,
      windows: [{ weekday: 2, startMinute: 1080, endMinute: 960 }],
    }).success).toBe(false);
  });
});
