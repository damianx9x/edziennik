import { z } from "zod";

const optionalId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().uuid().optional(),
);
const score = z.coerce.number().int().min(1).max(5);

export const progressObservationSchema = z.object({
  studentId: z.string().uuid(),
  scheduleSlotId: optionalId,
  speaking: score,
  listening: score,
  reading: score,
  writing: score,
  vocabulary: score,
  grammar: score,
  engagement: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    score.optional(),
  ),
  note: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(2_000).optional(),
  ),
  observedAt: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce.date().optional(),
  ),
});

export type ProgressActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

