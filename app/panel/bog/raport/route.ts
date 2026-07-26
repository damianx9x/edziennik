import { NextResponse } from "next/server";

import { db } from "@/lib/server/db";
import { requireSystemOwner } from "@/modules/identity/auth/session";
import {
  buildConfigurationChecks,
  sanitizeDiagnosticValue,
} from "@/modules/system-owner/diagnostics";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSystemOwner("/panel/bog");
  const now = new Date();
  const [counts, logs] = await Promise.all([
    Promise.all([
      db.school.count(),
      db.user.count({ where: { status: "ACTIVE", archivedAt: null } }),
      db.session.count({ where: { expiresAt: { gt: now } } }),
      db.auditLog.count(),
      db.recordChangeRequest.count({ where: { status: "PENDING" } }),
      db.importBatch.count({ where: { status: "FAILED", archivedAt: null } }),
    ]),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        actor: { select: { role: true } },
        school: { select: { slug: true } },
      },
    }),
  ]);

  await db.auditLog.create({
    data: {
      schoolId: session.user.schoolId,
      actorId: session.user.id,
      action: "system.diagnostic_report.downloaded",
      entityType: "System",
      metadata: { logEntryCount: logs.length },
    },
  });

  const report = {
    generatedAt: now.toISOString(),
    release: process.env.NEXT_PUBLIC_APP_RELEASE ?? "unknown",
    runtime: {
      node: process.version,
      environment: process.env.NODE_ENV ?? "unknown",
      uptimeSeconds: Math.round(process.uptime()),
    },
    configuration: buildConfigurationChecks(process.env),
    counts: {
      schools: counts[0],
      activeUsers: counts[1],
      activeSessions: counts[2],
      auditEvents: counts[3],
      pendingRecordChanges: counts[4],
      failedImports: counts[5],
    },
    audit: logs.map((entry) => ({
      ...entry,
      metadata: sanitizeDiagnosticValue(entry.metadata),
    })),
    privacy:
      "Raport nie zawiera haseł, tokenów, adresów e-mail, telefonów, IP ani treści wiadomości.",
  };
  const date = now.toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(report, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="kla-diagnostyka-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
