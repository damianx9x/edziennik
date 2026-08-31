import release from "@/manuals/release.json";

export const manualRelease = release;

export type ManualAudience = "school" | "owner";

export function canDownloadManual(
  role: "SYSTEM_OWNER" | "DIRECTOR" | "TEACHER" | "PARENT" | "STUDENT",
  audience: ManualAudience,
): boolean {
  return audience === "school" || role === "SYSTEM_OWNER";
}
