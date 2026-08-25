import { describe, expect, it } from "vitest";

import { accessibleGroupWhere, canPublishLearningContent, canSubmitHomework } from "./access";

const actor = { id: "actor", schoolId: "school" } as const;

describe("learning access scope", () => {
  it("keeps the technical owner outside educational records", () => {
    expect(accessibleGroupWhere({ ...actor, role: "SYSTEM_OWNER" })).toMatchObject({ id: { in: [] } });
  });

  it("scopes a parent through active links to their children", () => {
    expect(accessibleGroupWhere({ ...actor, role: "PARENT" })).toMatchObject({
      schoolId: "school",
      enrollments: { some: { status: "ACTIVE", student: { childLinks: { some: { parentId: "actor", archivedAt: null } } } } },
    });
  });

  it("allows staff to publish and only students to submit", () => {
    expect(canPublishLearningContent("DIRECTOR")).toBe(true);
    expect(canPublishLearningContent("TEACHER")).toBe(true);
    expect(canPublishLearningContent("PARENT")).toBe(false);
    expect(canSubmitHomework("STUDENT")).toBe(true);
    expect(canSubmitHomework("PARENT")).toBe(false);
  });
});

