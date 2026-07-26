import type { IdentityRole } from "./access";

export function isMfaRequiredForRole(
  role: IdentityRole,
  directorMfaRequired = process.env.KLA_REQUIRE_DIRECTOR_MFA !== "0",
): boolean {
  if (role === "SYSTEM_OWNER") return true;
  return role === "DIRECTOR" && directorMfaRequired;
}
