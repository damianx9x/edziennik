import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { type NextRequest } from "next/server";

import { db } from "@/lib/server/db";
import { requireSystemOwner } from "@/modules/identity/auth/session";
import { parseExportRange } from "@/modules/system-owner/export-range";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXPORT_ROOT = "/srv/kla-vault/exports";
const EXPORT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export async function GET(request: NextRequest, context: { params: Promise<{ exportId: string }> }) {
  const session = await requireSystemOwner("/panel/bog");
  const { exportId } = await context.params;
  if (!EXPORT_ID.test(exportId)) return new Response("Nieprawidłowy eksport.", { status: 400 });

  const filename = `kla-full-export-${exportId}.tar.age`;
  const filePath = `${EXPORT_ROOT}/${filename}`;
  const checksumPath = `${EXPORT_ROOT}/kla-full-export-${exportId}.sha256`;
  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return new Response("Eksport wygasł albo został już usunięty.", { status: 404 });
  }
  if (!fileStat.isFile() || Date.now() - fileStat.mtimeMs > 24 * 60 * 60 * 1000) {
    return new Response("Eksport wygasł. Przygotuj nowy plik.", { status: 410 });
  }

  const checksum = (await readFile(checksumPath, "utf8").catch(() => "")).split(/\s+/)[0] ?? "";
  const etag = checksum ? `"sha256-${checksum}"` : `"${fileStat.size}-${Math.trunc(fileStat.mtimeMs)}"`;
  const requestedRange = request.headers.get("range");
  const ifRange = request.headers.get("if-range");
  const range = parseExportRange(ifRange && ifRange !== etag ? null : requestedRange, fileStat.size);
  if (range === "invalid") return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${fileStat.size}` } });
  const start = range?.start ?? 0;
  const end = range?.end ?? fileStat.size - 1;
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": String(end - start + 1),
    "Content-Type": "application/octet-stream",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  });
  if (checksum) headers.set("X-KLA-SHA256", checksum);
  if (range) headers.set("Content-Range", `bytes ${start}-${end}/${fileStat.size}`);
  if (start === 0) {
    await db.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action: "system.export.download_started",
        entityType: "RaspberryServer",
        entityId: exportId,
        metadata: { filename, size: fileStat.size },
      },
    });
  }
  return new Response(Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream<Uint8Array>, { status: range ? 206 : 200, headers });
}
