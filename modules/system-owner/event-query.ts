import type { UserRole } from "@/app/generated/prisma/client";

export const ownerEventRoles = [
  "SYSTEM_OWNER",
  "DIRECTOR",
  "TEACHER",
  "PARENT",
  "STUDENT",
] as const satisfies readonly UserRole[];

export function safeEventRole(value: string | undefined): UserRole | "" {
  return ownerEventRoles.includes(value as UserRole) ? (value as UserRole) : "";
}

export function safeEventSchool(
  value: string | undefined,
  schoolIds: ReadonlySet<string>,
  allowPlatform = false,
): string {
  if (allowPlatform && value === "platform") return "platform";
  return value && schoolIds.has(value) ? value : "";
}
