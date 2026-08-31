import { requireSystemOwner } from "@/modules/identity/auth/session";
import { manualPdfResponse } from "@/modules/manuals/server";

export async function GET() {
  await requireSystemOwner("/panel/pomoc");
  return manualPdfResponse("owner");
}
