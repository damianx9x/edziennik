import { z } from "zod";

import { invitableIdentityRoleValues } from "../auth/access";

import { normalizeEmail } from "./token";

const personName = z
  .string()
  .trim()
  .min(2, "Wpisz co najmniej 2 znaki.")
  .max(80, "To pole może mieć maksymalnie 80 znaków.");

export const invitationRoleSchema = z.enum(invitableIdentityRoleValues);

export const createInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email("Wpisz poprawny adres e-mail.").max(254))
    .transform(normalizeEmail),
  name: personName,
  role: invitationRoleSchema,
});

export const createRoleQrInvitationSchema = z.object({
  role: invitationRoleSchema,
  validity: z.enum(["15m", "1h", "24h", "7d"]),
});

export const acceptInvitationSchema = z
  .object({
    token: z
      .string()
      .min(40)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/, "Link zaproszenia jest nieprawidłowy."),
    firstName: personName,
    lastName: personName,
    email: z
      .string()
      .trim()
      .pipe(z.email("Wpisz poprawny adres e-mail.").max(254))
      .transform(normalizeEmail),
    phone: z
      .string()
      .trim()
      .max(30, "Numer telefonu może mieć maksymalnie 30 znaków.")
      .optional(),
    password: z
      .string()
      .min(12, "Hasło musi mieć co najmniej 12 znaków.")
      .max(128, "Hasło może mieć maksymalnie 128 znaków."),
    passwordConfirmation: z.string(),
  })
  .refine((input) => input.password === input.passwordConfirmation, {
    message: "Hasła nie są takie same.",
    path: ["passwordConfirmation"],
  });

export const revokeInvitationSchema = z.object({
  invitationId: z.uuid(),
});

export const invitationRoleLabels = {
  SYSTEM_OWNER: "Bóg",
  DIRECTOR: "Dyrektor",
  TEACHER: "Wykładowca",
  PARENT: "Rodzic",
  STUDENT: "Uczeń",
} as const;

export const invitationValidityLabels = {
  "15m": "15 minut",
  "1h": "1 godzina",
  "24h": "24 godziny",
  "7d": "7 dni",
} as const;

export function canReuseArchivedAccount(
  existing:
    | { schoolId: string; status: string; archivedAt: Date | null }
    | null,
  schoolId: string,
): boolean {
  return Boolean(
    existing &&
      existing.schoolId === schoolId &&
      (existing.status === "ARCHIVED" || existing.archivedAt),
  );
}

export type InvitationAvailability =
  | "ready"
  | "accepted"
  | "revoked"
  | "expired";

export function getInvitationAvailability(input: {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
  now?: Date;
}): InvitationAvailability {
  if (input.acceptedAt) return "accepted";
  if (input.revokedAt) return "revoked";
  if (input.expiresAt.getTime() <= (input.now ?? new Date()).getTime()) {
    return "expired";
  }
  return "ready";
}
