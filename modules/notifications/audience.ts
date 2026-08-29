export function receivesFormalNotifications(role: string) {
  return role === "SYSTEM_OWNER" || role === "DIRECTOR" || role === "PARENT";
}

export function receivesChildLessonNotifications(role: string) {
  return role === "TEACHER" || role === "PARENT" || role === "STUDENT";
}
