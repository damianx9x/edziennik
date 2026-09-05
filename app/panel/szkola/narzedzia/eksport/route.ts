import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";
import { requireEnabledModule } from "@/modules/module-access/server";
import { createRecordsCsv } from "@/modules/imports/export";
import { loadSchoolExportRows } from "@/modules/imports/export-school";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireDirector("/panel/szkola/narzedzia");
  await requireEnabledModule(session, "dataTransfer");
  const schoolId = session.user.schoolId;
  const { rows, counts } = await loadSchoolExportRows(schoolId);
  const csv = createRecordsCsv(rows);
  const date = new Date().toISOString().slice(0, 10);

  await db.auditLog.create({
    data: {
      schoolId,
      actorId: session.user.id,
      action: "records.export.downloaded",
      entityType: "School",
      entityId: schoolId,
      metadata: {
        ...counts,
      },
    },
  });

  return new Response(csv, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="kla-kartoteki-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
