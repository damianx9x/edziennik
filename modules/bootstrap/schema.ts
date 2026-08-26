import { z } from "zod";

export const firstRunSchema = z
  .object({
    setupCode: z.string().trim().min(16, "Wpisz pełny kod instalacyjny."),
    schoolName: z.string().trim().min(2, "Wpisz nazwę szkoły.").max(120),
    ownerName: z.string().trim().min(3, "Wpisz imię i nazwisko.").max(120),
    email: z.email("Wpisz poprawny adres e-mail.").transform((value) => value.toLowerCase()),
    password: z
      .string()
      .min(12, "Hasło musi mieć co najmniej 12 znaków.")
      .max(128),
    passwordConfirmation: z.string(),
    acceptedSecurityNotice: z.literal("on", {
      error: "Potwierdź, że zapiszesz kody awaryjne w bezpiecznym miejscu.",
    }),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Hasła nie są takie same.",
  });

export type FirstRunInput = z.infer<typeof firstRunSchema>;

export type FirstRunState = {
  status: "idle" | "error" | "success";
  message: string;
  email?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialFirstRunState: FirstRunState = {
  status: "idle",
  message: "",
};
