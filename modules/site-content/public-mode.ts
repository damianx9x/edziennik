export type PublicPresentationMode = "SCHOOL" | "PRODUCT";

export function getPublicPresentationMode(
  value: string | undefined,
): PublicPresentationMode {
  return value?.trim().toLowerCase() === "school" ? "SCHOOL" : "PRODUCT";
}
