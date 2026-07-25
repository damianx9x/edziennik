import { describe, expect, it } from "vitest";
import { can, type Actor, type Resource } from "./can";

const schoolId = "school-kla";
const otherSchoolId = "school-other";

const director: Actor = { id: "director-1", schoolId, role: "DIRECTOR" };
const teacher: Actor = { id: "teacher-1", schoolId, role: "TEACHER" };
const parent: Actor = { id: "parent-1", schoolId, role: "PARENT" };
const student: Actor = { id: "student-1", schoolId, role: "STUDENT" };

describe("can", () => {
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
});
