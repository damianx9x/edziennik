import { z } from "zod";

export const contractAssignmentSchema = z.object({
  title: z.string().trim().min(3, "Wpisz nazwę umowy.").max(120),
  parentId: z.uuid("Wybierz rodzica."),
  studentId: z.uuid("Wybierz ucznia."),
  expiresAt: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || !Number.isNaN(Date.parse(`${value}T23:59:59`)),
      "Wpisz poprawną datę ważności.",
    ),
});

export const contractAcceptanceSchema = z.object({
  assignmentId: z.uuid(),
  confirmation: z.literal("accepted", {
    error: "Potwierdź zapoznanie się z dokumentem.",
  }),
});

export type ContractActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};
