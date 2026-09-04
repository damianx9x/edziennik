export type GroupTeacherCandidate = {
  teacherId: string;
  isPrimary: boolean;
};

/**
 * SchedulingRequirement is an override. The group's primary teacher is the
 * durable fallback for records created before the requirement editor existed.
 */
export function resolveRequirementTeacherId(
  requirementTeacherId: string | null,
  groupTeachers: readonly GroupTeacherCandidate[],
): string | null {
  if (
    requirementTeacherId &&
    groupTeachers.some((teacher) => teacher.teacherId === requirementTeacherId)
  ) {
    return requirementTeacherId;
  }
  return (
    groupTeachers.find((teacher) => teacher.isPrimary)?.teacherId ??
    groupTeachers[0]?.teacherId ??
    null
  );
}
