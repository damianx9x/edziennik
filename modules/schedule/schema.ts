import { addMinutes, format, isValid, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { z } from "zod";

export const SCHOOL_TIME_ZONE = "Europe/Warsaw";
export const DAY_START_HOUR = 13;
export const DAY_END_HOUR = 21;
export const GRID_STEP_MINUTES = 30;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):(?:00|30)$/;

export const scheduleIntervalSchema = z.object({
  date: z.string().regex(datePattern, "Wybierz poprawny dzień."),
  startTime: z
    .string()
    .regex(timePattern, "Wybierz godzinę kończącą się na :00 albo :30."),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(30, "Zajęcia muszą trwać co najmniej 30 minut.")
    .max(180, "Jedne zajęcia mogą trwać maksymalnie 180 minut.")
    .refine((value) => value % 30 === 0, "Wybierz pełne 30 minut."),
});

export const createScheduleSlotSchema = scheduleIntervalSchema.extend({
  groupId: z.string().uuid("Wybierz grupę."),
  roomId: z.string().uuid("Wybierz salę."),
  teacherId: z.string().uuid("Wybierz wykładowcę."),
});

export const moveScheduleSlotSchema = scheduleIntervalSchema.pick({
  date: true,
  startTime: true,
});

export const schedulingRequirementSchema = z.object({
  groupId: z.string().uuid("Wybierz grupę."),
  teacherId: z.string().uuid("Wybierz wykładowcę."),
  preferredRoomId: z.string().uuid("Wybierz preferowaną salę."),
  lessonsPerWeek: z.coerce.number().int().min(1).max(5),
  durationMinutes: z.coerce.number().int().min(30).max(180).refine(
    (value) => value % 30 === 0,
    "Czas lekcji musi być wielokrotnością 30 minut.",
  ),
  allowedWeekdays: z.array(z.coerce.number().int().min(1).max(6)).min(
    1,
    "Wybierz co najmniej jeden możliwy dzień.",
  ),
  preferredWeekdays: z.array(z.coerce.number().int().min(1).max(6)),
  earliestStartMinute: z.coerce.number().int().min(780).max(1230),
  latestEndMinute: z.coerce.number().int().min(810).max(1260),
  preferredStartMinute: z.union([
    z.coerce.number().int().min(780).max(1230),
    z.null(),
  ]),
}).refine(
  (value) =>
    value.earliestStartMinute + value.durationMinutes <= value.latestEndMinute,
  {
    message: "Zakres godzin jest krótszy niż jedna lekcja.",
    path: ["latestEndMinute"],
  },
);

export const teacherAvailabilitySchema = z.object({
  teacherId: z.string().uuid("Wybierz wykładowcę."),
  weekdays: z.array(z.coerce.number().int().min(1).max(6)).min(
    1,
    "Wybierz co najmniej jeden dzień dostępności.",
  ),
  startMinute: z.coerce.number().int().min(780).max(1230),
  endMinute: z.coerce.number().int().min(810).max(1260),
}).refine((value) => value.startMinute < value.endMinute, {
  message: "Godzina końca musi być późniejsza niż początek.",
  path: ["endMinute"],
});

export type ScheduleIntervalInput = z.infer<typeof scheduleIntervalSchema>;

export function toUtcInterval(
  input: ScheduleIntervalInput,
  timeZone = SCHOOL_TIME_ZONE,
) {
  const parsed = scheduleIntervalSchema.parse(input);
  const localValue = `${parsed.date}T${parsed.startTime}:00`;
  const startAt = fromZonedTime(localValue, timeZone);

  if (!isValid(startAt)) {
    throw new Error("Nie udało się odczytać daty zajęć.");
  }

  const roundTrip = format(toZonedTime(startAt, timeZone), "yyyy-MM-dd'T'HH:mm:ss");
  if (roundTrip !== localValue) {
    throw new Error(
      "Ta godzina nie istnieje po zmianie czasu. Wybierz inną godzinę.",
    );
  }

  const endAt = addMinutes(startAt, parsed.durationMinutes);
  const localStart = toZonedTime(startAt, timeZone);
  const localEnd = toZonedTime(endAt, timeZone);
  const startMinutes = localStart.getHours() * 60 + localStart.getMinutes();
  const endMinutes = localEnd.getHours() * 60 + localEnd.getMinutes();

  if (
    startMinutes < DAY_START_HOUR * 60 ||
    endMinutes > DAY_END_HOUR * 60
  ) {
    throw new Error(
      `Grafik obejmuje godziny ${DAY_START_HOUR}:00–${DAY_END_HOUR}:00.`,
    );
  }

  return { startAt, endAt };
}

export function getWeekStartDate(
  value: string | undefined,
  timeZone = SCHOOL_TIME_ZONE,
) {
  const reference =
    value && datePattern.test(value)
      ? fromZonedTime(`${value}T12:00:00`, timeZone)
      : new Date();
  const localReference = toZonedTime(reference, timeZone);
  return startOfWeek(localReference, { weekStartsOn: 1 });
}

export function getWeekStartKey(
  value: string | undefined,
  timeZone = SCHOOL_TIME_ZONE,
) {
  return format(getWeekStartDate(value, timeZone), "yyyy-MM-dd");
}

export function intervalsOverlap(
  first: { startAt: Date; endAt: Date },
  second: { startAt: Date; endAt: Date },
) {
  return first.startAt < second.endAt && first.endAt > second.startAt;
}
