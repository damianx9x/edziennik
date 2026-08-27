import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { sendAuthEmail } from "@/modules/identity/email/email-provider";
import { isIdentityRole } from "@/modules/identity/auth/access";

const diagnosticEventSchema = z.object({
  at: z.iso.datetime(),
  code: z.string().max(80),
  level: z.enum(["info", "warning", "error"]),
  message: z.string().max(500).optional(),
  route: z.string().startsWith("/").max(500),
});
const diagnosticsSchema = z.object({
  schemaVersion: z.literal(1),
  reference: z.string().regex(/^KLA-[A-F0-9]{8}$/),
  generatedAt: z.iso.datetime(),
  release: z.string().max(100),
  context: z.object({
    role: z.enum(["system-owner", "student", "parent", "teacher", "director", "guest"]),
    route: z.string().startsWith("/").max(500),
    locale: z.string().max(40),
    online: z.boolean(),
    platform: z.string().max(40),
    browser: z.string().max(80),
    viewport: z.object({ width: z.number().int().min(1).max(20_000), height: z.number().int().min(1).max(20_000), pixelRatio: z.number().min(0.1).max(20) }),
  }),
  privacy: z.string().max(500),
  events: z.array(diagnosticEventSchema).max(60),
});
const schema = z.object({
  reference: z.string().regex(/^KLA-[A-F0-9]{8}$/),
  description: z.string().trim().min(10).max(2000),
  route: z.string().startsWith("/").max(500),
  platform: z.enum(["IOS", "ANDROID", "WINDOWS", "MACOS", "LINUX", "OTHER"]),
  browser: z.string().max(80).optional(),
  diagnostics: diagnosticsSchema,
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !isIdentityRole(session.user.role) || !session.user.schoolId || session.user.status !== "ACTIVE") {
    return NextResponse.json({ message: "Zaloguj się, aby zapisać zgłoszenie w systemie." }, { status: 401 });
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 64 * 1024) {
    return NextResponse.json({ message: "Pakiet diagnostyczny jest za duży." }, { status: 413 });
  }
  const raw = await request.text();
  if (raw.length > 64 * 1024) return NextResponse.json({ message: "Pakiet diagnostyczny jest za duży." }, { status: 413 });
  const payload: unknown = (() => { try { return JSON.parse(raw || "null"); } catch { return null; } })();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ message: "Sprawdź opis zgłoszenia." }, { status: 400 });
  const recent = await db.feedbackReport.count({ where: { reporterId: session.user.id, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  if (recent >= 5) return NextResponse.json({ message: "Wysłano kilka zgłoszeń. Spróbuj ponownie za 10 minut." }, { status: 429 });
  const report = await db.feedbackReport.create({
    data: {
      schoolId: session.user.schoolId, reporterId: session.user.id, referenceCode: parsed.data.reference,
      reporterRole: session.user.role, description: parsed.data.description, route: parsed.data.route,
      platform: parsed.data.platform, browser: parsed.data.browser, appRelease: process.env.NEXT_PUBLIC_APP_RELEASE ?? "unknown",
      diagnosticMetadata: parsed.data.diagnostics as object,
    },
    select: { id: true },
  });
  try {
    await sendAuthEmail({
      to: process.env.KLA_BUG_REPORT_EMAIL ?? "damianx9x@me.com",
      subject: `KLA — zgłoszenie ${parsed.data.reference}`,
      text: [`Numer: ${parsed.data.reference}`, `Rola: ${session.user.role}`, `Sekcja: ${parsed.data.route}`, `Przeglądarka: ${parsed.data.browser ?? "brak"}`, "", parsed.data.description, "", `Identyfikator w systemie: ${report.id}`].join("\n"),
      category: "message",
    });
  } catch {
    // Zgłoszenie pozostaje w prywatnej bazie, nawet gdy SMTP jest chwilowo niedostępne.
  }
  return NextResponse.json({ ok: true, reference: parsed.data.reference });
}
