import { z } from "zod";

export const attendanceStatuses = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
] as const;

export type LessonAttendanceStatus = (typeof attendanceStatuses)[number];

const lessonJournalHeaderSchema = z.object({
  slotId: z.string().uuid("Nie udało się rozpoznać lekcji."),
  version: z.coerce.number().int().positive("Odśwież lekcję i spróbuj ponownie."),
  topic: z
    .string()
    .trim()
    .max(240, "Temat może mieć maksymalnie 240 znaków."),
});

const attendanceValueSchema = z.union([
  z.enum(attendanceStatuses),
  z.literal(""),
]);

export type LessonJournalInput = {
  slotId: string;
  version: number;
  topic: string | null;
  attendance: Array<{
    studentId: string;
    status: LessonAttendanceStatus | null;
  }>;
};

export function parseLessonJournalFormData(formData: FormData) {
  const header = lessonJournalHeaderSchema.safeParse({
    slotId: formData.get("slotId"),
    version: formData.get("version"),
    topic: formData.get("topic") ?? "",
  });
  if (!header.success) {
    return {
      success: false as const,
      message:
        header.error.issues[0]?.message ?? "Sprawdź dane dziennika lekcji.",
    };
  }

  const attendance: LessonJournalInput["attendance"] = [];
  const seenStudents = new Set<string>();
  for (const [key, rawValue] of formData.entries()) {
    if (!key.startsWith("attendance:")) continue;
    if (attendance.length >= 50) {
      return {
        success: false as const,
        message: "Jedna lekcja może zawierać maksymalnie 50 uczniów.",
      };
    }

    const studentId = key.slice("attendance:".length);
    const parsedStudentId = z.string().uuid().safeParse(studentId);
    const parsedStatus = attendanceValueSchema.safeParse(rawValue);
    if (
      !parsedStudentId.success ||
      !parsedStatus.success ||
      seenStudents.has(studentId)
    ) {
      return {
        success: false as const,
        message: "Lista obecności jest nieaktualna. Odśwież lekcję.",
      };
    }

    seenStudents.add(studentId);
    attendance.push({
      studentId,
      status: parsedStatus.data || null,
    });
  }

  return {
    success: true as const,
    data: {
      slotId: header.data.slotId,
      version: header.data.version,
      topic: header.data.topic || null,
      attendance,
    } satisfies LessonJournalInput,
  };
}
