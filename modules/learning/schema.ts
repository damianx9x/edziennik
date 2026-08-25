import { z } from "zod";

const id = z.string().uuid("Nieprawidłowy identyfikator.");
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

export const learningMaterialSchema = z
  .object({
    groupId: id,
    title: z.string().trim().min(2, "Wpisz tytuł materiału.").max(140),
    description: optionalText(2_000),
    externalUrl: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().url("Wpisz pełny adres https://.").max(2_000).optional(),
    ),
  })
  .superRefine((value, context) => {
    if (value.externalUrl && !value.externalUrl.startsWith("https://")) {
      context.addIssue({ code: "custom", path: ["externalUrl"], message: "Materiał zewnętrzny musi używać bezpiecznego adresu https://." });
    }
  });

export const homeworkAssignmentSchema = z.object({
  groupId: id,
  title: z.string().trim().min(2, "Wpisz tytuł zadania.").max(140),
  instructions: z.string().trim().min(3, "Dodaj krótką instrukcję.").max(5_000),
  dueAt: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce.date().optional(),
  ),
});

export const homeworkSubmissionSchema = z.object({
  assignmentId: id,
  studentNote: optionalText(3_000),
});

export const homeworkReviewSchema = z.object({
  submissionId: id,
  feedback: z.string().trim().min(2, "Dodaj krótką informację zwrotną.").max(3_000),
});

export type LearningActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

