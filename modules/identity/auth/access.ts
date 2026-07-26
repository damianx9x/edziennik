import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  userAc,
} from "better-auth/plugins/admin/access";

export const identityAccessControl = createAccessControl(defaultStatements);

const directorRole = identityAccessControl.newRole({
  ...adminAc.statements,
});

const systemOwnerRole = identityAccessControl.newRole({
  ...adminAc.statements,
});

const standardRole = identityAccessControl.newRole({
  ...userAc.statements,
});

export const identityRoles = {
  SYSTEM_OWNER: systemOwnerRole,
  DIRECTOR: directorRole,
  TEACHER: standardRole,
  PARENT: standardRole,
  STUDENT: standardRole,
} as const;

export type IdentityRole = keyof typeof identityRoles;

export const identityRoleValues = [
  "SYSTEM_OWNER",
  "DIRECTOR",
  "TEACHER",
  "PARENT",
  "STUDENT",
] as const satisfies readonly IdentityRole[];

export const invitableIdentityRoleValues = [
  "DIRECTOR",
  "TEACHER",
  "PARENT",
  "STUDENT",
] as const satisfies readonly IdentityRole[];

export function isIdentityRole(value: unknown): value is IdentityRole {
  return (
    typeof value === "string" &&
    identityRoleValues.includes(value as IdentityRole)
  );
}

export function isInvitableIdentityRole(
  value: unknown,
): value is (typeof invitableIdentityRoleValues)[number] {
  return (
    typeof value === "string" &&
    invitableIdentityRoleValues.includes(
      value as (typeof invitableIdentityRoleValues)[number],
    )
  );
}

export function isPrivilegedIdentityRole(
  role: IdentityRole,
): role is "SYSTEM_OWNER" | "DIRECTOR" {
  return role === "SYSTEM_OWNER" || role === "DIRECTOR";
}
