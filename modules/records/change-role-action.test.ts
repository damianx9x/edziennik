import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ db: { $transaction: mocks.transaction } }));
vi.mock("@/modules/identity/auth/session", () => ({ requireDirector: mocks.session }));
vi.mock("@/modules/module-access/server", () => ({ requireEnabledModule: vi.fn() }));
vi.mock("@/modules/schedule/resource-lock", () => ({ lockScheduleResources: vi.fn(), discardReadyScheduleGenerations: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { changePersonRoleAction } from "./change-role-action";

describe("role correction", () => {
  const id = "22222222-2222-4222-8222-222222222222";
  const actor = { id: "11111111-1111-4111-8111-111111111111", schoolId: "33333333-3333-4333-8333-333333333333", role: "DIRECTOR" };
  function form(role = "TEACHER") { const data = new FormData(); data.set("id", id); data.set("role", role); data.set("confirmation", "yes"); return data; }
  beforeEach(() => { vi.resetAllMocks(); mocks.session.mockResolvedValue({ user: actor }); });
  it("rejects privilege escalation before opening a transaction", async () => {
    expect((await changePersonRoleAction({ status: "idle" }, form("SYSTEM_OWNER"))).status).toBe("error");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("scopes the target to this school and eligible roles", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    mocks.transaction.mockImplementation((fn) => fn({ user: { findFirst } }));
    expect((await changePersonRoleAction({ status: "idle" }, form())).status).toBe("error");
    expect(findFirst).toHaveBeenCalledWith({ where: { id, schoolId: actor.schoolId, role: { in: ["TEACHER", "PARENT", "STUDENT"] }, archivedAt: null } });
  });
  it("revokes old parental links and sessions when correcting a parent into a teacher", async () => {
    const tx = { user: { findFirst: vi.fn().mockResolvedValue({ id, role: "PARENT", email: "qa@example.test" }), update: vi.fn() },
      recordChangeRequest: { updateMany: vi.fn() }, parentChild: { updateMany: vi.fn() }, teacherProfile: { upsert: vi.fn() }, session: { deleteMany: vi.fn() }, invitation: { updateMany: vi.fn() }, auditLog: { create: vi.fn() } };
    mocks.transaction.mockImplementation((fn) => fn(tx));
    expect((await changePersonRoleAction({ status: "idle" }, form())).status).toBe("success");
    expect(tx.parentChild.updateMany).toHaveBeenCalledWith({ where: { schoolId: actor.schoolId, parentId: id, archivedAt: null }, data: { archivedAt: expect.any(Date) } });
    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: id } });
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id }, data: { role: "TEACHER" } });
  });
  it("blocks a teacher with upcoming lessons instead of leaving an invalid timetable", async () => {
    const update = vi.fn();
    mocks.transaction.mockImplementation((fn) => fn({ user: { findFirst: vi.fn().mockResolvedValue({ id, role: "TEACHER", email: "qa@example.test" }), update }, scheduleSlot: { count: vi.fn().mockResolvedValue(1) } }));
    expect((await changePersonRoleAction({ status: "idle" }, form("PARENT"))).message).toContain("przyszłe lekcje");
    expect(update).not.toHaveBeenCalled();
  });
});
