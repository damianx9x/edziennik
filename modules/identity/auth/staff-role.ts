import type { IdentityRole } from "./access";

export function isSchoolStaffRole(
  role: IdentityRole,
): role is "SYSTEM_OWNER" | "DIRECTOR" | "TEACHER" {
  return role === "SYSTEM_OWNER" || role === "DIRECTOR" || role === "TEACHER";
}
