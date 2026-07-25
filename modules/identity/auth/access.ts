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

const standardRole = identityAccessControl.newRole({
  ...userAc.statements,
});

export const identityRoles = {
  DIRECTOR: directorRole,
  TEACHER: standardRole,
  PARENT: standardRole,
  STUDENT: standardRole,
} as const;

export type IdentityRole = keyof typeof identityRoles;

export const identityRoleValues = [
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
