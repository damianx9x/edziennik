import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { scanFileForMalware } from "./malware-scanner";

const SCHOOL_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORAGE_KEY_PATTERN =
  /^[0-9a-f-]{36}\/[0-9]{4}\/[0-9]{2}\/[0-9a-f-]{36}$/i;

export type StoredFileResult = {
  storageKey: string;
  sizeBytes: number;
  sha256: string;
};

export interface FileStorage {
  put(input: {
    schoolId: string;
    bytes: Uint8Array;
  }): Promise<StoredFileResult>;
  read(storageKey: string): Promise<Uint8Array>;
  remove(storageKey: string): Promise<void>;
}

export class LocalFileStorage implements FileStorage {
  readonly rootDirectory: string;

  constructor(rootDirectory: string) {
    this.rootDirectory = path.resolve(rootDirectory);
    const publicDirectory = path.resolve(process.cwd(), "public");
    const relativeToPublic = path.relative(publicDirectory, this.rootDirectory);

    if (
      relativeToPublic === "" ||
      (!relativeToPublic.startsWith("..") && !path.isAbsolute(relativeToPublic))
    ) {
      throw new Error(
        "Prywatny magazyn plików nie może znajdować się w katalogu public/.",
      );
    }
  }

  async put(input: {
    schoolId: string;
    bytes: Uint8Array;
  }): Promise<StoredFileResult> {
    if (!SCHOOL_ID_PATTERN.test(input.schoolId)) {
      throw new Error("Nieprawidłowy identyfikator szkoły.");
    }
    if (input.bytes.byteLength === 0) {
      throw new Error("Nie można zapisać pustego pliku.");
    }

    await scanFileForMalware(input.bytes);

    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const storageKey = `${input.schoolId}/${year}/${month}/${randomUUID()}`;
    const targetPath = this.resolveStorageKey(storageKey);

    await mkdir(path.dirname(targetPath), { recursive: true, mode: 0o700 });
    await writeFile(targetPath, input.bytes, { flag: "wx", mode: 0o600 });

    return {
      storageKey,
      sizeBytes: input.bytes.byteLength,
      sha256: createHash("sha256").update(input.bytes).digest("hex"),
    };
  }

  async read(storageKey: string): Promise<Uint8Array> {
    return readFile(this.resolveStorageKey(storageKey));
  }

  async remove(storageKey: string): Promise<void> {
    await unlink(this.resolveStorageKey(storageKey));
  }

  private resolveStorageKey(storageKey: string): string {
    if (!STORAGE_KEY_PATTERN.test(storageKey)) {
      throw new Error("Nieprawidłowy klucz prywatnego pliku.");
    }

    const targetPath = path.resolve(this.rootDirectory, storageKey);
    const relative = path.relative(this.rootDirectory, targetPath);
    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative) ||
      relative.length === 0
    ) {
      throw new Error("Plik znajduje się poza prywatnym magazynem.");
    }
    return targetPath;
  }
}

let storage: FileStorage | undefined;

export function getFileStorage(): FileStorage {
  if (storage) return storage;

  const provider = process.env.FILE_STORAGE_PROVIDER ?? "local";
  if (provider !== "local") {
    throw new Error(
      `Magazyn ${provider} nie jest jeszcze skonfigurowany. Ustaw FILE_STORAGE_PROVIDER=local.`,
    );
  }

  const rootDirectory =
    process.env.KLA_PRIVATE_FILES_DIR ??
    path.join(process.cwd(), ".data", "private-files");
  storage = new LocalFileStorage(rootDirectory);
  return storage;
}
