import { requireActiveSession } from "@/modules/identity/auth/session";
import { manualPdfResponse } from "@/modules/manuals/server";

export async function GET() {
  await requireActiveSession("/panel/pomoc");
  return manualPdfResponse("school");
}
