import { z } from "zod";

export const cefrValues = [
  "PRE_A1",
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "MIXED",
] as const;

export const cefrLabels: Record<(typeof cefrValues)[number], string> = {
  PRE_A1: "Pre-A1",
  A1: "A1",
  A2: "A2",
  B1: "B1",
  B2: "B2",
  C1: "C1",
  C2: "C2",
  MIXED: "Mieszany",
};

export const createRoomSchema = z.object({
  locationId: z.uuid("Wybierz lokalizację sali."),
  name: z
    .string()
    .trim()
    .min(2, "Nazwa sali musi mieć co najmniej 2 znaki.")
    .max(80, "Nazwa sali może mieć maksymalnie 80 znaków."),
  capacity: z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : Number(value)))
    .pipe(
      z
        .number("Pojemność musi być liczbą.")
        .int("Pojemność musi być liczbą całkowitą.")
        .min(1, "Pojemność musi wynosić co najmniej 1.")
        .max(100, "Pojemność może wynosić maksymalnie 100.")
        .optional(),
    ),
});

export const createGroupSchema = z.object({
  locationId: z.uuid("Wybierz lokalizację grupy."),
  name: z
    .string()
    .trim()
    .min(2, "Nazwa grupy musi mieć co najmniej 2 znaki.")
    .max(100, "Nazwa grupy może mieć maksymalnie 100 znaków."),
  level: z.enum(cefrValues),
});

export const createLocationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nazwa lokalizacji musi mieć co najmniej 2 znaki.")
    .max(100, "Nazwa lokalizacji może mieć maksymalnie 100 znaków."),
  address: z
    .string()
    .trim()
    .max(200, "Adres może mieć maksymalnie 200 znaków.")
    .transform((value) => value || undefined),
  isOnline: z.boolean(),
});

export const archiveRecordSchema = z.object({
  recordId: z.uuid(),
  recordType: z.enum(["room", "group", "person"]),
});
