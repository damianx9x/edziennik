import { NextResponse } from "next/server";

import { db } from "@/lib/server/db";
import { getServerSession } from "@/modules/identity/auth/session";
import {
  isSameOriginPageVisit,
  isTrackedPagePath,
  pageVisitHourlyLimit,
} from "@/modules/observability/page-visits";

export async function POST(request: Request) {
  if (!isSameOriginPageVisit(request)) {
    return new NextResponse(null, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { path?: unknown }
    | null;
  const path = body?.path;
  if (!isTrackedPagePath(path)) {
    return new NextResponse(null, { status: 400 });
  }

  const session = await getServerSession();
  const school =
    session?.user.schoolId
      ? { id: session.user.schoolId }
      : await db.school.findFirst({
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
  if (!school) return new NextResponse(null, { status: 204 });

  const userId = session?.user.id ?? null;
  await db.$transaction(async (transaction) => {
    const limiterKey = `page-visit:${school.id}:${userId ?? "anonymous"}`;
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${limiterKey}))`;

    const now = Date.now();
    const [recent, hourlyCount] = await Promise.all([
      transaction.pageVisit.findFirst({
        where: {
          schoolId: school.id,
          userId,
          path,
          visitedAt: { gte: new Date(now - 30_000) },
        },
        select: { id: true },
      }),
      transaction.pageVisit.count({
        where: {
          schoolId: school.id,
          userId,
          visitedAt: { gte: new Date(now - 60 * 60_000) },
        },
      }),
    ]);
    if (
      recent ||
      hourlyCount >= pageVisitHourlyLimit(Boolean(userId))
    ) {
      return;
    }

    await transaction.pageVisit.create({
      data: { schoolId: school.id, userId, path },
    });
  });
  return new NextResponse(null, { status: 204 });
}
