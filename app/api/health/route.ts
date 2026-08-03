import { NextResponse } from "next/server";

import { db } from "@/lib/server/db";
import { checkApplicationHealth } from "@/modules/observability/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await checkApplicationHealth(() => db.$queryRaw`SELECT 1`);

  return NextResponse.json(health, {
    status: health.status === "ok" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
