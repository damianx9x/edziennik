import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";

import { db } from "@/lib/server/db";
import { isTrustedSameOrigin } from "@/lib/server/same-origin";
import { requireDirector } from "@/modules/identity/auth/session";
import {
  defaultSiteContent,
  enrichLegacyDefaultSiteContent,
} from "@/modules/site-content/default-content";
import { siteContentSchema } from "@/modules/site-content/schema";
import { resolvePublicPresentationMode } from "@/modules/site-content/public-mode.server";
import { productSiteContent } from "@/modules/site-content/product-content";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestedScope = new URL(request.url).searchParams.get("scope");
  if (requestedScope === "editor") {
    const session = await requireDirector("/panel/szkola/narzedzia/strona");
    const school = await db.school.findUnique({
      where: { id: session.user.schoolId },
      select: { siteContent: true },
    });
    const parsed = siteContentSchema.safeParse(school?.siteContent);
    const content = parsed.success
      ? enrichLegacyDefaultSiteContent(parsed.data)
      : defaultSiteContent;
    return NextResponse.json(content, {
      headers: { "Cache-Control": "no-store", "X-KLA-Editor-Scope": "school" },
    });
  }

  const mode = await resolvePublicPresentationMode();
  if (mode === "PRODUCT") {
    return NextResponse.json(productSiteContent, {
      headers: { "Cache-Control": "no-store", "X-KLA-Public-Mode": mode },
    });
  }
  const publicSchoolSlug = process.env.KLA_PUBLIC_SCHOOL_SLUG;
  const school = publicSchoolSlug
    ? await db.school.findUnique({ where: { slug: publicSchoolSlug }, select: { siteContent: true } })
    : null;
  const parsed = siteContentSchema.safeParse(school?.siteContent);
  const content = parsed.success
    ? enrichLegacyDefaultSiteContent(parsed.data)
    : defaultSiteContent;
  return NextResponse.json(content, {
    headers: { "Cache-Control": "no-store", "X-KLA-Public-Mode": mode },
  });
}

export async function PUT(request: Request) {
  if (!isTrustedSameOrigin(request)) return NextResponse.json({ message: "Nieprawidłowe źródło żądania." }, { status: 403 });
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

export async function DELETE(request: Request) {
  if (!isTrustedSameOrigin(request)) return NextResponse.json({ message: "Nieprawidłowe źródło żądania." }, { status: 403 });
  const session = await requireDirector("/panel/szkola/narzedzia/strona");
  await db.$transaction([
    db.school.update({ where: { id: session.user.schoolId }, data: { siteContent: Prisma.DbNull } }),
    db.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "site.content.reset", entityType: "School", entityId: session.user.schoolId } }),
  ]);
  return NextResponse.json({ ok: true });
}
