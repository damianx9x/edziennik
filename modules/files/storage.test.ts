import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { LocalFileStorage } from "./storage";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("LocalFileStorage", () => {
  it("stores an opaque private file and verifies its digest", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "kla-files-"));
    temporaryDirectories.push(directory);
    const storage = new LocalFileStorage(directory);
    const bytes = new TextEncoder().encode("synthetic import");

    const result = await storage.put({
      schoolId: "d694d0a5-1786-4b23-8d1f-4ba66e74a2c0",
      bytes,
    });

    expect(result.storageKey).not.toContain("synthetic");
    expect(result.sizeBytes).toBe(bytes.byteLength);
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(Array.from(await storage.read(result.storageKey))).toEqual(
      Array.from(bytes),
    );
  });

  it("rejects path traversal and a public storage directory", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "kla-files-"));
    temporaryDirectories.push(directory);
    const storage = new LocalFileStorage(directory);

    await expect(storage.read("../../etc/passwd")).rejects.toThrow(
      "Nieprawidłowy klucz",
    );
    expect(
      () => new LocalFileStorage(path.join(process.cwd(), "public", "files")),
    ).toThrow("public");
  });
});
