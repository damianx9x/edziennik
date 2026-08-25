import type { IdentityRole } from "./access";

export function isSchoolStaffRole(
  role: IdentityRole,
): role is "DIRECTOR" | "TEACHER" {
  return role === "DIRECTOR" || role === "TEACHER";
}
