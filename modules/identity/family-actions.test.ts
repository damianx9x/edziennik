import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  session: vi.fn(), hash: vi.fn(), transaction: vi.fn(), linkCount: vi.fn(), groupCount: vi.fn(),
}));
vi.mock("./auth/session", () => ({ requirePanelAccess: mocks.session }));
vi.mock("better-auth/crypto", () => ({ hashPassword: mocks.hash }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ db: { parentChild: { count: mocks.linkCount }, courseGroup: { count: mocks.groupCount }, $transaction: mocks.transaction } }));
vi.mock("@/modules/schedule/resource-lock", () => ({ lockScheduleResources: vi.fn() }));
import { setChildPasswordAction, createChildAction } from "./family-actions";

describe("family password server action", () => {
  const parent = { id: "11111111-1111-4111-8111-111111111111", role: "PARENT", schoolId: "33333333-3333-4333-8333-333333333333" };
  const childId = "22222222-2222-4222-8222-222222222222";
  function form() { const data = new FormData(); data.set("childId", childId); data.set("password", "Synthetic-test-123"); data.set("repeatPassword", "Synthetic-test-123"); return data; }
  beforeEach(() => { vi.resetAllMocks(); mocks.session.mockResolvedValue({ user: parent }); mocks.hash.mockResolvedValue("hash-not-plaintext"); });
  it("does not hash or write for an unrelated child", async () => {
    mocks.linkCount.mockResolvedValue(0);
    expect((await setChildPasswordAction({ status: "idle" }, form())).status).toBe("error");
    expect(mocks.hash).not.toHaveBeenCalled(); expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.linkCount).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ schoolId: parent.schoolId, parentId: parent.id, childId, archivedAt: null }) }));
  });
  it("rechecks a removed relation inside the transaction", async () => {
    mocks.linkCount.mockResolvedValue(1);
    const write = vi.fn();
    mocks.transaction.mockImplementation((fn) => fn({ user: { findFirst: vi.fn().mockResolvedValue(parent) }, parentChild: { findFirst: vi.fn().mockResolvedValue(null) }, account: { updateMany: write } }));
    expect((await setChildPasswordAction({ status: "idle" }, form())).status).toBe("error");
    expect(write).not.toHaveBeenCalled();
  });
  it("updates only credentials, revokes sessions and audits without the password", async () => {
    mocks.linkCount.mockResolvedValue(1);
    const tx = { user: { findFirst: vi.fn().mockResolvedValue(parent), update: vi.fn() }, parentChild: { findFirst: vi.fn().mockResolvedValue({ schoolId: parent.schoolId, parentId: parent.id, child: { id: childId, email: "child@example.org", status: "ACTIVE", accounts: [{ id: "credential" }] } }) }, account: { updateMany: vi.fn() }, session: { deleteMany: vi.fn() }, auditLog: { count: vi.fn().mockResolvedValue(0), create: vi.fn() } };
    mocks.transaction.mockImplementation((fn) => fn(tx));
    expect((await setChildPasswordAction({ status: "idle" }, form())).status).toBe("success");
    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: childId } });
    expect(tx.account.updateMany).toHaveBeenCalledWith({ where: { userId: childId, providerId: "credential" }, data: { password: "hash-not-plaintext" } });
    expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain("Synthetic-test-123");
  });
});

describe("parent creates a new child with a requested group", () => {
  const parent = { id: "11111111-1111-4111-8111-111111111111", role: "PARENT", schoolId: "33333333-3333-4333-8333-333333333333" };
  const childId = "22222222-2222-4222-8222-222222222222";
  function form() { return new Map(Object.entries({ name: "Łucja Żółć", locationId: "44444444-4444-4444-8444-444444444444", groupId: "55555555-5555-4555-8555-555555555555", password: "Synthetic-test-123", repeatPassword: "Synthetic-test-123" })); }
  function data() { const result = new FormData(); for (const [key, value] of form()) result.set(key, value); return result; }
  beforeEach(() => { vi.resetAllMocks(); mocks.session.mockResolvedValue({ user: parent }); mocks.hash.mockResolvedValue("hash-not-plaintext"); });
  it("rejects a group outside the selected school and location before hashing", async () => {
    mocks.groupCount.mockResolvedValue(0);
    expect((await createChildAction({ status: "idle" }, data())).status).toBe("error");
    expect(mocks.hash).not.toHaveBeenCalled();
    expect(mocks.groupCount).toHaveBeenCalledWith({ where: expect.objectContaining({ schoolId: parent.schoolId, locationId: form().get("locationId"), archivedAt: null }) });
  });
  it("allocates a numbered readable login and does not enroll until approval", async () => {
    mocks.groupCount.mockResolvedValue(1);
    const tx = { $executeRaw: vi.fn(), user: { count: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(1).mockResolvedValueOnce(0), create: vi.fn().mockResolvedValue({ id: childId }) },
      courseGroup: { count: vi.fn().mockResolvedValue(1) }, parentChild: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
      account: { create: vi.fn() }, recordChangeRequest: { create: vi.fn() }, auditLog: { create: vi.fn() }, enrollment: { create: vi.fn() } };
    mocks.transaction.mockImplementation((fn) => fn(tx));
    expect(await createChildAction({ status: "idle" }, data())).toMatchObject({ status: "success", login: "lucjazolc1" });
    expect(tx.enrollment.create).not.toHaveBeenCalled();
    expect(tx.account.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: childId, password: "hash-not-plaintext" }) });
    expect(JSON.stringify([tx.recordChangeRequest.create.mock.calls, tx.auditLog.create.mock.calls])).not.toMatch(/Synthetic-test|hash-not-plaintext/);
    expect(tx.recordChangeRequest.create).toHaveBeenCalledWith({ data: expect.objectContaining({ entityId: childId, payload: expect.objectContaining({ kind: "CHILD_GROUP", childId }) }) });
  });
  it("stops if the selected group was archived during submission", async () => {
    mocks.groupCount.mockResolvedValue(1);
    const create = vi.fn();
    mocks.transaction.mockImplementation((fn) => fn({ user: { count: vi.fn().mockResolvedValue(1), create }, courseGroup: { count: vi.fn().mockResolvedValue(0) } }));
    expect((await createChildAction({ status: "idle" }, data())).status).toBe("error");
    expect(create).not.toHaveBeenCalled();
  });
});
