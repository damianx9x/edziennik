import type { IdentityRole } from "./access";

const roleHome: Record<IdentityRole, string> = {
  DIRECTOR: "/panel/szkola",
  TEACHER: "/panel/szkola",
  PARENT: "/panel/rodzic",
  STUDENT: "/panel/uczen",
};

export function getRoleHome(role: IdentityRole): string {
  return roleHome[role];
}

export function getSafeReturnPath(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://kingslanguageacademy.pl");
    if (parsed.origin !== "https://kingslanguageacademy.pl") {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
