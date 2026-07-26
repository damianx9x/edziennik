export const SYSTEM_OWNER_LOGIN = "bog";
export const SYSTEM_OWNER_EMAIL = "bog@owner.kla.internal";

export function normalizeLoginIdentifier(identifier: string): string {
  const normalized = identifier.trim().toLowerCase();
  return normalized === SYSTEM_OWNER_LOGIN ? SYSTEM_OWNER_EMAIL : normalized;
}
