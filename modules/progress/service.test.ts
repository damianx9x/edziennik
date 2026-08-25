import { describe, expect, it } from "vitest";

import { accessibleStudentWhere } from "./access";
import { buildDescriptiveProgressSummary, type ProgressPoint } from "./summary";

const base = { speaking: 2, listening: 3, reading: 2, writing: 2, vocabulary: 3, grammar: 2 };

describe("descriptive student progress", () => {
  it("does not make predictions from a single observation", () => {
    const result = buildDescriptiveProgressSummary([{ ...base, observedAt: new Date("2026-08-01") }]);
    expect(result.kind).toBe("insufficient");
    expect(result.changes).toBeNull();
  });

  it("reports only the recorded change", () => {
    const points: ProgressPoint[] = [
      { ...base, observedAt: new Date("2026-08-01") },
      { ...base, speaking: 4, writing: 3, observedAt: new Date("2026-08-20") },
    ];
    const result = buildDescriptiveProgressSummary(points);
    expect(result.kind).toBe("descriptive");
    expect(result.changes?.speaking).toBe(2);
    expect(result.message).toContain("Nie jest diagnozą ani prognozą");
  });

  it("denies the technical account and scopes parents to linked children", () => {
    expect(accessibleStudentWhere({ id: "owner", schoolId: "school", role: "SYSTEM_OWNER" })).toMatchObject({ id: { in: [] } });
    expect(accessibleStudentWhere({ id: "parent", schoolId: "school", role: "PARENT" })).toMatchObject({ childLinks: { some: { parentId: "parent", archivedAt: null } } });
  });
});
