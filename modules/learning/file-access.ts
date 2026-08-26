import type { LearningActor } from "./access";

export function canViewLearningStoredFile(input: {
  role: LearningActor["role"];
  hasAccessibleGroup: boolean;
  containsHomeworkSubmission: boolean;
  isOwnSubmission: boolean;
  isLinkedChildSubmission: boolean;
}): boolean {
  if (!input.hasAccessibleGroup) return false;
  if (!input.containsHomeworkSubmission) return true;
  if (input.role === "SYSTEM_OWNER" || input.role === "DIRECTOR" || input.role === "TEACHER") return true;
  if (input.role === "STUDENT") return input.isOwnSubmission;
  if (input.role === "PARENT") return input.isLinkedChildSubmission;
  return false;
}
