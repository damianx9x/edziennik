export const SYSTEM_OWNER_LOGIN = "bog";
export const SYSTEM_OWNER_EMAIL = "bog@owner.kla.internal";

const DEMO_LOGIN_ALIASES: Readonly<Record<string, string>> = {
  kinga: "kinga.demo@invalid.example",
  dyrektor: "dyrektor.demo@invalid.example",
  wykladowca: "wykladowca.demo@invalid.example",
  rodzic: "rodzic.demo@invalid.example",
  uczen: "uczen.panel.demo@invalid.example",
};

export function normalizeLoginIdentifier(identifier: string): string {
  const normalized = identifier.trim().toLowerCase();
  if (/^uczen-[a-f0-9]{16}$/.test(normalized)) return `${normalized}@children.kla.invalid`;
  if (normalized === SYSTEM_OWNER_LOGIN) return SYSTEM_OWNER_EMAIL;
  return DEMO_LOGIN_ALIASES[normalized] ?? (/^[a-z0-9]{3,64}$/.test(normalized) ? `${normalized}@children.kla.invalid` : normalized);
}
