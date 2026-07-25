import { z } from "zod";

import { identityRoleValues } from "../auth/access";

import { normalizeEmail } from "./token";

const personName = z
  .string()
  .trim()
  .min(2, "Wpisz imię i nazwisko lub czytelną nazwę.")
  .max(80, "Nazwa może mieć maksymalnie 80 znaków.");

export const invitationRoleSchema = z.enum(identityRoleValues);

export const createInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email("Wpisz poprawny adres e-mail.").max(254))
    .transform(normalizeEmail),
  name: personName,
  role: invitationRoleSchema,
});

export const acceptInvitationSchema = z
  .object({
    token: z
      .string()
      .min(40)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/, "Link zaproszenia jest nieprawidłowy."),
    name: personName,
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
  DIRECTOR: "Dyrektor",
  TEACHER: "Wykładowca",
  PARENT: "Rodzic",
  STUDENT: "Uczeń",
} as const;

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
