import { mkdir, open, readFile, stat, writeFile } from "node:fs/promises";

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/server/db";
import { requireSystemOwner } from "@/modules/identity/auth/session";
import { prepareFullImport, restoreFullImport } from "@/modules/system-owner/server-control";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IMPORT_ROOT = "/srv/kla-vault/imports";
const CHUNK_SIZE = 5 * 1024 * 1024;
const MAX_IMPORT_SIZE = 5 * 1024 * 1024 * 1024;
const importIdSchema = z.string().uuid();
const startSchema = z.object({ action: z.literal("start"), filename: z.string().min(1).max(180), size: z.number().int().positive().max(MAX_IMPORT_SIZE) });
const verifySchema = z.object({ action: z.literal("verify"), id: z.string().uuid(), recoveryKey: z.string().min(40).max(200) });
const restoreSchema = z.object({ action: z.literal("restore"), id: z.string().uuid(), confirmation: z.literal("ODTWARZAM KLA") });

type UploadMetadata = { id: string; actorId: string; schoolId: string; filename: string; size: number; createdAt: string };

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return Boolean(host) && origin === `${protocol}://${host}`;
}

function paths(id: string) {
  return { data: `${IMPORT_ROOT}/${id}.part`, metadata: `${IMPORT_ROOT}/${id}.json` };
}

async function readMetadata(id: string, actorId: string, schoolId: string) {
  const parsedId = importIdSchema.safeParse(id);
  if (!parsedId.success) throw new Error("Nieprawidłowy identyfikator przesyłania.");
  const metadata = JSON.parse(await readFile(paths(parsedId.data).metadata, "utf8")) as UploadMetadata;
  if (metadata.actorId !== actorId || metadata.schoolId !== schoolId) throw new Error("Ta kopia należy do innej sesji.");
  if (Date.now() - Date.parse(metadata.createdAt) > 24 * 60 * 60 * 1000) throw new Error("Przesyłanie wygasło. Rozpocznij ponownie.");
  return metadata;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Nieprawidłowe źródło żądania." }, { status: 403 });
  const session = await requireSystemOwner("/panel/bog/ustawienia");
  const body = await request.json().catch(() => null);
  const start = startSchema.safeParse(body);
  if (start.success) {
    if (!start.data.filename.toLowerCase().endsWith(".tar.age")) return NextResponse.json({ message: "Wybierz pełną kopię KLA z rozszerzeniem .tar.age." }, { status: 400 });
    const id = crypto.randomUUID();
    const metadata: UploadMetadata = { id, actorId: session.user.id, schoolId: session.user.schoolId, filename: start.data.filename, size: start.data.size, createdAt: new Date().toISOString() };
    try {
      await mkdir(IMPORT_ROOT, { recursive: true, mode: 0o700 });
      const file = await open(paths(id).data, "wx", 0o600);
      await file.close();
      await writeFile(paths(id).metadata, JSON.stringify(metadata), { flag: "wx", mode: 0o600 });
      await db.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "system.import.upload_started", entityType: "RaspberryServer", entityId: id, metadata: { filename: start.data.filename, size: start.data.size } } });
      return NextResponse.json({ id, offset: 0, chunkSize: CHUNK_SIZE });
    } catch {
      return NextResponse.json({ message: "Magazyn importu nie jest gotowy. Sprawdź sejf Raspberry." }, { status: 503 });
    }
  }

  const verify = verifySchema.safeParse(body);
  if (verify.success) {
    try {
      const metadata = await readMetadata(verify.data.id, session.user.id, session.user.schoolId);
      const uploaded = await stat(paths(verify.data.id).data);
      if (uploaded.size !== metadata.size) return NextResponse.json({ message: `Plik nie jest kompletny (${uploaded.size} z ${metadata.size} bajtów).` }, { status: 409 });
      const preparation = await prepareFullImport(verify.data.id, verify.data.recoveryKey);
      await db.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "system.import.verified", entityType: "RaspberryServer", entityId: verify.data.id, metadata: { size: preparation.size, sha256: preparation.sha256, sourceCommit: preparation.sourceCommit } } });
      return NextResponse.json({ preparation });
    } catch (error) {
      return NextResponse.json({ message: error instanceof Error ? error.message : "Nie udało się sprawdzić kopii." }, { status: 400 });
    }
  }

  const restore = restoreSchema.safeParse(body);
  if (restore.success) {
    try {
      await readMetadata(restore.data.id, session.user.id, session.user.schoolId);
      const message = await restoreFullImport(restore.data.id);
      await db.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "system.import.restore_requested", entityType: "RaspberryServer", entityId: restore.data.id } });
      return NextResponse.json({ message });
    } catch (error) {
      return NextResponse.json({ message: error instanceof Error ? error.message : "Nie udało się rozpocząć odtwarzania." }, { status: 400 });
    }
  }
  return NextResponse.json({ message: "Nieprawidłowa operacja importu." }, { status: 400 });
}

export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ message: "Nieprawidłowe źródło żądania." }, { status: 403 });
  const session = await requireSystemOwner("/panel/bog/ustawienia");
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const offset = Number(request.nextUrl.searchParams.get("offset"));
  if (!Number.isSafeInteger(offset) || offset < 0) return NextResponse.json({ message: "Nieprawidłowa pozycja fragmentu." }, { status: 400 });
  const contentLength = Number(request.headers.get("content-length"));
  if (!Number.isSafeInteger(contentLength) || contentLength < 1 || contentLength > CHUNK_SIZE) return NextResponse.json({ message: "Fragment ma nieprawidłowy rozmiar." }, { status: 413 });
  try {
    const metadata = await readMetadata(id, session.user.id, session.user.schoolId);
    const target = paths(id).data;
    const current = await stat(target);
    if (current.size !== offset) return NextResponse.json({ message: "Przesyłanie wymaga wznowienia od aktualnej pozycji.", offset: current.size }, { status: 409 });
    if (offset + contentLength > metadata.size) return NextResponse.json({ message: "Fragment przekracza rozmiar kopii." }, { status: 400 });
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ message: "Brak danych fragmentu." }, { status: 400 });
    const file = await open(target, "r+");
    let written = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (written + value.byteLength > contentLength) throw new Error("Fragment jest większy niż zadeklarowano.");
        await file.write(value, 0, value.byteLength, offset + written);
        written += value.byteLength;
      }
      await file.sync();
    } finally {
      await file.close();
    }
    if (written !== contentLength) return NextResponse.json({ message: "Fragment został przerwany.", offset: offset + written }, { status: 400 });
    return NextResponse.json({ offset: offset + written, complete: offset + written === metadata.size });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Nie udało się przesłać fragmentu." }, { status: 400 });
  }
}
