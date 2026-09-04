import { z } from "zod";

export const configurableModuleKeys = [
  "records",
  "invitations",
  "schedule",
  "messages",
  "notifications",
  "learning",
  "progress",
  "contracts",
  "payments",
  "statistics",
] as const;

export type ConfigurableModuleKey = (typeof configurableModuleKeys)[number];
export type ConfigurableRole = "DIRECTOR" | "TEACHER" | "PARENT" | "STUDENT";

export const configurableRoles: ConfigurableRole[] = [
  "DIRECTOR",
  "TEACHER",
  "PARENT",
  "STUDENT",
];

export const moduleCatalog: Record<
  ConfigurableModuleKey,
  { label: string; description: string; supportedRoles: ConfigurableRole[] }
> = {
  records: {
    label: "Kartoteki",
    description: "Osoby, grupy, sale i przypisania.",
    supportedRoles: ["DIRECTOR", "TEACHER"],
  },
  invitations: {
    label: "Zaproszenia i konta",
    description: "Zakładanie kont i odzyskiwanie dostępu.",
    supportedRoles: ["DIRECTOR"],
  },
  schedule: {
    label: "Grafik",
    description: "Plan zajęć, dostępność i obecności.",
    supportedRoles: configurableRoles,
  },
  messages: {
    label: "Wiadomości",
    description: "Rozmowy, ogłoszenia i załączniki.",
    supportedRoles: configurableRoles,
  },
  notifications: {
    label: "Powiadomienia",
    description: "Lista spraw wymagających uwagi.",
    supportedRoles: configurableRoles,
  },
  learning: {
    label: "Nauka",
    description: "Materiały, zadania i oddawanie prac.",
    supportedRoles: configurableRoles,
  },
  progress: {
    label: "Postępy",
    description: "Obserwacje, frekwencja i kolejne kroki.",
    supportedRoles: configurableRoles,
  },
  contracts: {
    label: "Umowy",
    description: "Pakiety dokumentów i ich akceptacja.",
    supportedRoles: ["DIRECTOR", "PARENT"],
  },
  payments: {
    label: "Płatności",
    description: "Raty i ręcznie oznaczane statusy.",
    supportedRoles: ["DIRECTOR", "PARENT"],
  },
  statistics: {
    label: "Statystyki szkoły",
    description: "Odwiedziny i stan działania szkoły.",
    supportedRoles: ["DIRECTOR"],
  },
};

const rolePolicySchema = z.object({
  DIRECTOR: z.boolean(),
  TEACHER: z.boolean(),
  PARENT: z.boolean(),
  STUDENT: z.boolean(),
});

export const moduleAccessSchema = z.object(
  Object.fromEntries(
    configurableModuleKeys.map((key) => [key, rolePolicySchema]),
  ) as Record<ConfigurableModuleKey, typeof rolePolicySchema>,
);

export type ModuleAccessPolicy = z.infer<typeof moduleAccessSchema>;

export const defaultModuleAccessPolicy = Object.fromEntries(
  configurableModuleKeys.map((key) => [
    key,
    Object.fromEntries(
      configurableRoles.map((role) => [
        role,
        moduleCatalog[key].supportedRoles.includes(role),
      ]),
    ),
  ]),
) as ModuleAccessPolicy;

export function parseModuleAccessPolicy(value: unknown): ModuleAccessPolicy {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return structuredClone(defaultModuleAccessPolicy);
  }

  const source = value as Record<string, unknown>;
  const merged = structuredClone(defaultModuleAccessPolicy);
  for (const key of configurableModuleKeys) {
    const moduleValue = source[key];
    if (!moduleValue || typeof moduleValue !== "object" || Array.isArray(moduleValue)) continue;
    const roles = moduleValue as Record<string, unknown>;
    for (const role of configurableRoles) {
      if (
        moduleCatalog[key].supportedRoles.includes(role) &&
        typeof roles[role] === "boolean"
      ) {
        merged[key][role] = roles[role];
      }
    }
  }
  return merged;
}

export const roleLabels: Record<ConfigurableRole, string> = {
  DIRECTOR: "Dyrektor",
  TEACHER: "Wykładowca",
  PARENT: "Rodzic",
  STUDENT: "Uczeń",
};
