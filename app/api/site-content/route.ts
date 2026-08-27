import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";

import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";
import { defaultSiteContent } from "@/modules/site-content/default-content";
import { siteContentSchema } from "@/modules/site-content/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const school = await db.school.findFirst({ orderBy: { createdAt: "asc" }, select: { siteContent: true } });
  const parsed = siteContentSchema.safeParse(school?.siteContent);
  return NextResponse.json(parsed.success ? parsed.data : defaultSiteContent, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(request: Request) {
  const session = await requireDirector("/panel/szkola/narzedzia/strona");
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > 15 * 1024 * 1024) return NextResponse.json({ message: "Treść i zdjęcia są za duże." }, { status: 413 });
  const raw = await request.text();
  if (raw.length > 15 * 1024 * 1024) return NextResponse.json({ message: "Treść i zdjęcia są za duże." }, { status: 413 });
  const value: unknown = (() => { try { return JSON.parse(raw); } catch { return null; } })();
  const parsed = siteContentSchema.safeParse(value);
  if (!parsed.success) return NextResponse.json({ message: "Sprawdź puste lub zbyt długie pola." }, { status: 400 });
  await db.$transaction([
    db.school.update({ where: { id: session.user.schoolId }, data: { siteContent: parsed.data } }),
    db.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "site.content.updated", entityType: "School", entityId: session.user.schoolId } }),
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await requireDirector("/panel/szkola/narzedzia/strona");
  await db.$transaction([
    db.school.update({ where: { id: session.user.schoolId }, data: { siteContent: Prisma.DbNull } }),
    db.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "site.content.reset", entityType: "School", entityId: session.user.schoolId } }),
  ]);
  return NextResponse.json({ ok: true });
}
