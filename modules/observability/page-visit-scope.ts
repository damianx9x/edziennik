import type { PublicPresentationMode } from "@/modules/site-content/public-mode";

export function resolvePageVisitSchoolId(input: {
  sessionSchoolId?: string | null;
  publicMode: PublicPresentationMode;
  publicSchoolId?: string | null;
}): string | null | undefined {
  if (input.sessionSchoolId) return input.sessionSchoolId;
  if (input.publicMode === "PRODUCT") return null;
  return input.publicSchoolId ?? undefined;
}
