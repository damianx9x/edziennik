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
