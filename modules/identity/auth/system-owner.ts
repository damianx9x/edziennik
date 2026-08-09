export const SYSTEM_OWNER_LOGIN = "bog";
export const SYSTEM_OWNER_EMAIL = "bog@owner.kla.internal";

const DEMO_LOGIN_ALIASES: Readonly<Record<string, string>> = {
  dyrektor: "dyrektor.demo@invalid.example",
  wykladowca: "wykladowca.demo@invalid.example",
  rodzic: "rodzic.demo@invalid.example",
  uczen: "uczen.panel.demo@invalid.example",
};

export function normalizeLoginIdentifier(identifier: string): string {
  const normalized = identifier.trim().toLowerCase();
  if (normalized === SYSTEM_OWNER_LOGIN) return SYSTEM_OWNER_EMAIL;
  return DEMO_LOGIN_ALIASES[normalized] ?? normalized;
}
