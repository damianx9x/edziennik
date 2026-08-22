import { z } from "zod";

export const relationshipKindValues = [
  "PARENT_CHILDREN",
  "STUDENT_PARENTS",
  "STUDENT_GROUPS",
  "TEACHER_GROUPS",
  "GROUP_STUDENTS",
  "GROUP_TEACHERS",
  "ROOM_PREFERRED_GROUPS",
  "GROUP_PREFERRED_ROOM",
] as const;

export const relationshipKindSchema = z.enum(relationshipKindValues);
export type RelationshipKind = z.infer<typeof relationshipKindSchema>;

export const studentAvailabilityWindowsSchema = z
  .array(
    z
      .object({
        weekday: z.number().int().min(1).max(6),
        startMinute: z.number().int().min(720).max(1260),
        endMinute: z.number().int().min(750).max(1320),
      })
      .refine((window) => window.startMinute < window.endMinute, {
        message: "Godzina zakończenia musi być późniejsza niż rozpoczęcia.",
      }),
  )
  .max(6);

export const relationshipRequestPayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("RELATIONSHIPS"),
    relationKind: relationshipKindSchema,
    addIds: z.array(z.uuid()).max(300),
    removeIds: z.array(z.uuid()).max(300),
  }),
  z.object({
    kind: z.literal("STUDENT_AVAILABILITY"),
    windows: studentAvailabilityWindowsSchema,
  }),
]);

export const relationshipUpdateSchema = z.object({
  entityId: z.uuid(),
  relationKind: relationshipKindSchema,
  selectedIds: z.array(z.uuid()).max(300),
});

export const studentAvailabilityUpdateSchema = z.object({
  studentId: z.uuid(),
  windows: studentAvailabilityWindowsSchema,
});

export const relationshipKindLabels: Record<RelationshipKind, string> = {
  PARENT_CHILDREN: "przypisane dzieci",
  STUDENT_PARENTS: "rodzice i opiekunowie",
  STUDENT_GROUPS: "grupy ucznia",
  TEACHER_GROUPS: "grupy wykładowcy",
  GROUP_STUDENTS: "skład grupy",
  GROUP_TEACHERS: "wykładowcy grupy",
  ROOM_PREFERRED_GROUPS: "grupy preferujące salę",
  GROUP_PREFERRED_ROOM: "preferowana sala grupy",
};
