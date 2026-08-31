import { NextResponse } from "next/server";

import { db } from "@/lib/server/db";
import { getServerSession } from "@/modules/identity/auth/session";
import {
  isSameOriginPageVisit,
  isTrackedPagePath,
  pageVisitHourlyLimit,
} from "@/modules/observability/page-visits";
import { resolvePageVisitSchoolId } from "@/modules/observability/page-visit-scope";
import { getCoarseRequestContext } from "@/modules/observability/request-context";
import { resolvePublicPresentationMode } from "@/modules/site-content/public-mode.server";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > 4096) {
    return new NextResponse(null, { status: 413 });
  }
  if (!isSameOriginPageVisit(request)) {
    return new NextResponse(null, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    path?: unknown;
  } | null;
  const path = body?.path;
  if (!isTrackedPagePath(path)) {
    return new NextResponse(null, { status: 400 });
  }

  const session = await getServerSession();
  const publicMode = await resolvePublicPresentationMode();
  let publicSchoolId: string | null = null;
  if (!session?.user.schoolId && publicMode === "SCHOOL") {
    const publicSchoolSlug = process.env.KLA_PUBLIC_SCHOOL_SLUG;
    const publicSchool = publicSchoolSlug
      ? await db.school.findUnique({
          where: { slug: publicSchoolSlug },
          select: { id: true },
        })
      : null;
    publicSchoolId = publicSchool?.id ?? null;
  }
  const schoolId = resolvePageVisitSchoolId({
    sessionSchoolId: session?.user.schoolId,
    publicMode,
    publicSchoolId,
  });
  if (schoolId === undefined) return new NextResponse(null, { status: 204 });

  const userId = session?.user.id ?? null;
  const requestContext = getCoarseRequestContext(
    request.headers,
    process.env.KLA_ANALYTICS_SALT ?? process.env.BETTER_AUTH_SECRET ?? "",
  );
  await db.$transaction(async (transaction) => {
    const tenantKey = schoolId ?? "platform-product";
    const limiterKey = `page-visit:${tenantKey}:${userId ?? requestContext.clientHash ?? "anonymous"}`;
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${limiterKey}))`;

    const now = Date.now();
    const [recent, hourlyCount] = await Promise.all([
      transaction.pageVisit.findFirst({
        where: {
          schoolId,
          userId,
          path,
          visitedAt: { gte: new Date(now - 30_000) },
        },
        select: { id: true },
      }),
      transaction.pageVisit.count({
        where: {
          schoolId,
          userId,
          visitedAt: { gte: new Date(now - 60 * 60_000) },
        },
      }),
    ]);
    if (recent || hourlyCount >= pageVisitHourlyLimit(Boolean(userId))) {
      return;
    }

    await transaction.pageVisit.create({
      data: { schoolId, userId, path, ...requestContext },
    });
  });
  return new NextResponse(null, { status: 204 });
}
