import { requireActiveSession } from "@/modules/identity/auth/session";
import { manualAudienceForRole } from "@/modules/manuals/release";
import { manualPdfResponse } from "@/modules/manuals/server";

export async function GET() {
  const session = await requireActiveSession("/panel/pomoc");
  return manualPdfResponse(manualAudienceForRole(session.user.role));
}
