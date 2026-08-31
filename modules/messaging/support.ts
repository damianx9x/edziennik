import type { IdentityRole } from "@/modules/identity/auth/access";

export const creatorSupportConversationTitle = "Wsparcie techniczne · Damian Eron";

export function canStartCreatorSupport(role: IdentityRole): boolean {
  return role !== "SYSTEM_OWNER";
}
