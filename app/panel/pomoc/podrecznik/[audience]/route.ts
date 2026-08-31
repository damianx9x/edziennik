import { notFound } from "next/navigation";

import { requireActiveSession } from "@/modules/identity/auth/session";
import {
  canDownloadManual,
  schoolManualAudiences,
  type SchoolManualAudience,
} from "@/modules/manuals/release";
import { manualPdfResponse } from "@/modules/manuals/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ audience: string }> },
) {
  const session = await requireActiveSession("/panel/pomoc");
  const { audience } = await params;
  if (!schoolManualAudiences.includes(audience as SchoolManualAudience)) notFound();
  const manualAudience = audience as SchoolManualAudience;
  if (!canDownloadManual(session.user.role, manualAudience)) notFound();
  return manualPdfResponse(manualAudience);
}
