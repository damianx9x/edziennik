import { z } from "zod";

export const restartPolicySchema = z.object({
  frequency: z.enum(["off", "daily", "weekly"]),
  hour: z.coerce.number().int().min(0).max(23),
  minute: z.coerce.number().int().min(0).max(59),
  confirmed: z.literal("yes", { error: "Potwierdź krótką przerwę podczas restartu." }),
});

export type RestartPolicy = {
  frequency: "off" | "daily" | "weekly";
  hour: number;
  minute: number;
};
