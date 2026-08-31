import { describe, expect, it } from "vitest";

import { canStartCreatorSupport, creatorSupportConversationTitle } from "./support";

describe("creator support conversation", () => {
  it("is available to school roles without duplicating the owner chat", () => {
    expect(canStartCreatorSupport("DIRECTOR")).toBe(true);
    expect(canStartCreatorSupport("TEACHER")).toBe(true);
    expect(canStartCreatorSupport("PARENT")).toBe(true);
    expect(canStartCreatorSupport("STUDENT")).toBe(true);
    expect(canStartCreatorSupport("SYSTEM_OWNER")).toBe(false);
    expect(creatorSupportConversationTitle).toContain("Damian Eron");
  });
});
