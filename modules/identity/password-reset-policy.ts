export function canRequestPasswordReset(
  actorRole: string,
  targetRole: string,
): boolean {
  if (actorRole === "SYSTEM_OWNER") return true;
  return actorRole === "DIRECTOR" && targetRole !== "SYSTEM_OWNER";
}
