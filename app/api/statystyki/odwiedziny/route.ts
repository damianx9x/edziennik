import { NextResponse } from "next/server";

import { db } from "@/lib/server/db";
import { getServerSession } from "@/modules/identity/auth/session";

const allowedPath = /^\/(?:$|panel(?:\/[a-z0-9ąćęłńóśźż_-]+)*)$/i;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return new NextResponse(null, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { path?: unknown }
    | null;
  const path = typeof body?.path === "string" ? body.path : "";
  if (path.length > 160 || !allowedPath.test(path)) {
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
  if (userId) {
    const recent = await db.pageVisit.findFirst({
      where: {
        schoolId: school.id,
        userId,
        path,
        visitedAt: { gte: new Date(Date.now() - 30_000) },
      },
      select: { id: true },
    });
    if (recent) return new NextResponse(null, { status: 204 });
  }

  await db.pageVisit.create({
    data: { schoolId: school.id, userId, path },
  });
  return new NextResponse(null, { status: 204 });
}
