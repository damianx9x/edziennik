import { describe, expect, it } from "vitest";
import { can, type Actor, type Resource } from "./can";

const schoolId = "school-kla";
const otherSchoolId = "school-other";

const systemOwner: Actor = {
  id: "owner-1",
  schoolId,
  role: "SYSTEM_OWNER",
};
const director: Actor = { id: "director-1", schoolId, role: "DIRECTOR" };
const teacher: Actor = { id: "teacher-1", schoolId, role: "TEACHER" };
const parent: Actor = { id: "parent-1", schoolId, role: "PARENT" };
const student: Actor = { id: "student-1", schoolId, role: "STUDENT" };

describe("can", () => {
  it("allows only the system owner to open system diagnostics", () => {
    expect(
      can(systemOwner, "view:owner-dashboard", {
        schoolId: otherSchoolId,
      }),
    ).toBe(true);
    expect(
      can(director, "view:owner-dashboard", { schoolId }),
    ).toBe(false);
  });

  it("allows the system owner to troubleshoot resources across schools", () => {
    expect(
      can(systemOwner, "manage:school", { schoolId: otherSchoolId }),
    ).toBe(true);
  });

  it("allows a director to manage resources in their school", () => {
    expect(can(director, "manage:school", { schoolId })).toBe(true);
  });

  it("blocks a director from another school", () => {
    expect(
      can(director, "manage:school", { schoolId: otherSchoolId }),
    ).toBe(false);
  });

  it("allows a teacher to open only an assigned group", () => {
    const assignedGroup: Resource = {
      schoolId,
      teacherIds: [teacher.id],
    };
    const foreignGroup: Resource = {
      schoolId,
      teacherIds: ["teacher-2"],
    };

    expect(can(teacher, "view:group", assignedGroup)).toBe(true);
    expect(can(teacher, "view:group", foreignGroup)).toBe(false);
    expect(can(teacher, "view:schedule", assignedGroup)).toBe(true);
    expect(can(teacher, "view:schedule", foreignGroup)).toBe(false);
    expect(can(teacher, "manage:schedule", assignedGroup)).toBe(false);
    expect(can(teacher, "edit:lesson", assignedGroup)).toBe(true);
    expect(can(teacher, "edit:attendance", assignedGroup)).toBe(true);
    expect(can(teacher, "edit:lesson", foreignGroup)).toBe(false);
    expect(can(teacher, "edit:attendance", foreignGroup)).toBe(false);
  });

  it("allows a parent to open only a linked child", () => {
    const ownChild: Resource = {
      schoolId,
      ownerId: student.id,
      parentIds: [parent.id],
    };
    const foreignChild: Resource = {
      schoolId,
      ownerId: "student-2",
      parentIds: ["parent-2"],
    };

    expect(can(parent, "view:student", ownChild)).toBe(true);
    expect(can(parent, "view:student", foreignChild)).toBe(false);
  });

  it("keeps contracts and payments inside the parent-child boundary", () => {
    const ownRecord: Resource = { schoolId, parentIds: [parent.id] };
    const foreignRecord: Resource = { schoolId, parentIds: ["parent-2"] };

    expect(can(parent, "view:contract", ownRecord)).toBe(true);
    expect(can(parent, "accept:contract", ownRecord)).toBe(true);
    expect(can(parent, "view:payment", ownRecord)).toBe(true);
    expect(can(parent, "view:contract", foreignRecord)).toBe(false);
    expect(can(parent, "view:payment", foreignRecord)).toBe(false);
    expect(can(student, "view:payment", ownRecord)).toBe(false);
    expect(can(teacher, "view:contract", ownRecord)).toBe(false);
  });

  it("allows only school management to change contracts and payments", () => {
    expect(can(director, "manage:contracts", { schoolId })).toBe(true);
    expect(can(director, "manage:payments", { schoolId })).toBe(true);
    expect(can(teacher, "manage:contracts", { schoolId })).toBe(false);
    expect(can(parent, "manage:payments", { schoolId })).toBe(false);
  });

  it("keeps technical diagnostics away from family contracts and payments", () => {
    const familyRecord: Resource = { schoolId, parentIds: [parent.id] };

    expect(can(systemOwner, "view:contract", familyRecord)).toBe(false);
    expect(can(systemOwner, "manage:contracts", familyRecord)).toBe(false);
    expect(can(systemOwner, "view:payment", familyRecord)).toBe(false);
    expect(can(systemOwner, "manage:payments", familyRecord)).toBe(false);
    expect(can(systemOwner, "accept:contract", familyRecord)).toBe(false);
  });

  it("allows a student to open only their own profile", () => {
    expect(
      can(student, "view:student", { schoolId, ownerId: student.id }),
    ).toBe(true);
    expect(
      can(student, "view:student", { schoolId, ownerId: "student-2" }),
    ).toBe(false);
  });

  it("blocks a student from the director dashboard", () => {
    expect(
      can(student, "view:director-dashboard", { schoolId }),
    ).toBe(false);
  });

  it("keeps group conversations inside active relationships", () => {
    const ownConversation: Resource = {
      schoolId,
      teacherIds: [teacher.id],
      parentIds: [parent.id],
      studentIds: [student.id],
    };
    const foreignConversation: Resource = {
      schoolId,
      teacherIds: ["teacher-2"],
      parentIds: ["parent-2"],
      studentIds: ["student-2"],
    };

    for (const actor of [teacher, parent, student]) {
      expect(can(actor, "view:conversation", ownConversation)).toBe(true);
      expect(can(actor, "send:group-message", ownConversation)).toBe(true);
      expect(can(actor, "view:conversation", foreignConversation)).toBe(false);
      expect(can(actor, "send:group-message", foreignConversation)).toBe(false);
    }
  });

  it("keeps a direct conversation inside its explicit participant list", () => {
    const directConversation: Resource = { schoolId, participantIds: [teacher.id, parent.id] };
    expect(can(teacher, "view:conversation", directConversation)).toBe(true);
    expect(can(parent, "send:group-message", directConversation)).toBe(true);
    expect(can(student, "view:conversation", directConversation)).toBe(false);
    expect(can(director, "view:conversation", directConversation)).toBe(true);
  });

  it("lets the director read and write school conversations while access is audited by the loader", () => {
    expect(can(director, "view:conversation", { schoolId })).toBe(true);
    expect(can(director, "audit:view-conversation", { schoolId })).toBe(true);
    expect(can(director, "send:announcement", { schoolId })).toBe(true);
    expect(can(director, "send:group-message", { schoolId })).toBe(true);
  });

  it("keeps technical diagnostics away from message content", () => {
    const conversation: Resource = {
      schoolId,
      teacherIds: [teacher.id],
      parentIds: [parent.id],
      studentIds: [student.id],
    };

    expect(can(systemOwner, "view:conversation", conversation)).toBe(false);
    expect(can(systemOwner, "send:group-message", conversation)).toBe(false);
    expect(can(systemOwner, "send:announcement", conversation)).toBe(false);
    expect(can(systemOwner, "audit:view-conversation", conversation)).toBe(false);
  });

  it.each([
    [teacher, "view:teacher-dashboard"],
    [parent, "view:parent-dashboard"],
    [student, "view:student-dashboard"],
  ] as const)("allows only the matching role panel", (actor, action) => {
    expect(can(actor, action, { schoolId })).toBe(true);

    const otherActors = [teacher, parent, student].filter(
      (candidate) => candidate.id !== actor.id,
    );

    for (const otherActor of otherActors) {
      expect(can(otherActor, action, { schoolId })).toBe(false);
    }
  });
});
