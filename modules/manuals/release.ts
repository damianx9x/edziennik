import release from "@/manuals/release.json";

export const manualRelease = release;

export type SchoolManualAudience = "director" | "teacher" | "parent" | "student";
export type ManualAudience = SchoolManualAudience | "owner";
export type ManualRole = "SYSTEM_OWNER" | "DIRECTOR" | "TEACHER" | "PARENT" | "STUDENT";

export const schoolManualAudiences: SchoolManualAudience[] = ["director", "teacher", "parent", "student"];

export const manualLabels: Record<ManualAudience, string> = {
  director: "Podręcznik dyrektora",
  teacher: "Podręcznik wykładowcy",
  parent: "Podręcznik rodzica",
  student: "Podręcznik ucznia",
  owner: "Podręcznik właściciela systemu",
};

export function manualAudienceForRole(role: ManualRole): ManualAudience {
  return {
    SYSTEM_OWNER: "owner",
    DIRECTOR: "director",
    TEACHER: "teacher",
    PARENT: "parent",
    STUDENT: "student",
  }[role] as ManualAudience;
}

export function canDownloadManual(
  role: ManualRole,
  audience: ManualAudience,
): boolean {
  return role === "SYSTEM_OWNER" || manualAudienceForRole(role) === audience;
}
