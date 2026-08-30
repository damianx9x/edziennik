import { describe, expect, it } from "vitest";

import { getAuditActionLabel, getAuditEventTone, getAuditModule } from "./audit-presentation";

describe("system owner audit presentation", () => {
  it("groups technical action keys into business modules", () => {
    expect(getAuditModule("schedule.lesson.created")).toBe("Grafik i lekcje");
    expect(getAuditModule("unknown.action")).toBe("Pozostałe");
  });

  it("keeps known labels readable and falls back safely", () => {
    expect(getAuditActionLabel("messages.sent")).toBe("Wysłano wiadomość");
    expect(getAuditActionLabel("custom_action.done")).toContain("Custom");
  });

  it("makes rejected and successful operations visually distinct", () => {
    expect(getAuditEventTone("contracts.file.rejected")).toBe("critical");
    expect(getAuditEventTone("learning.material.published")).toBe("success");
  });
});
