import { z } from "zod";

export const recordRoleValues = ["TEACHER", "PARENT", "STUDENT"] as const;

export const recordRoleLabels: Record<(typeof recordRoleValues)[number], string> =
  {
    TEACHER: "Wykładowca",
    PARENT: "Rodzic",
    STUDENT: "Uczeń",
  };

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine(
    (value) => value === "" || z.email().safeParse(value).success,
    "Wpisz poprawny adres e-mail.",
  );

export const createPersonSchema = z
  .object({
    role: z.enum(recordRoleValues),
    firstName: z
      .string()
      .trim()
      .min(2, "Imię musi mieć co najmniej 2 znaki.")
      .max(60, "Imię może mieć maksymalnie 60 znaków."),
    lastName: z
      .string()
      .trim()
      .min(2, "Nazwisko musi mieć co najmniej 2 znaki.")
      .max(80, "Nazwisko może mieć maksymalnie 80 znaków."),
    email: optionalEmail,
    phone: z.string().trim().max(30, "Numer telefonu jest za długi."),
    externalId: z
      .string()
      .trim()
      .max(80, "Identyfikator może mieć maksymalnie 80 znaków."),
  })
  .superRefine((input, context) => {
    if (
      (input.role === "TEACHER" || input.role === "PARENT") &&
      input.email === ""
    ) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Wykładowca i rodzic potrzebują adresu e-mail.",
      });
    }
  })
  .transform((input) => ({
    ...input,
    email: input.email.toLocaleLowerCase("pl-PL") || undefined,
    phone: input.phone || undefined,
    externalId: input.externalId || undefined,
  }));
