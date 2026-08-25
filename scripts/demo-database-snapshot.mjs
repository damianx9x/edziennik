#!/usr/bin/env node

import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import pg from "pg";

const MAGIC = Buffer.from("KLASNAPSHOT1\n", "utf8");
const stateDir = resolve(
  process.env.KLA_SNAPSHOT_STATE_DIR ??
    join(process.env.HOME ?? ".", "Library/Application Support/KLA Demo Host"),
);
const snapshotDir = resolve(
  process.env.KLA_SNAPSHOT_DIR ?? join(stateDir, "snapshots"),
);
const keyPath = resolve(
  process.env.KLA_SNAPSHOT_KEY_FILE ?? join(stateDir, "snapshot-recovery.key"),
);
const filesDir = resolve(
  process.env.KLA_SNAPSHOT_FILES_DIR ??
    process.env.KLA_PRIVATE_FILES_DIR ??
    join(stateDir, "private-files"),
);

const restoreAllowed = process.env.KLA_SNAPSHOT_RESTORE_ALLOWED === "1";

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function safeLabel(value) {
  return String(value ?? "snapshot")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "snapshot";
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function recoveryKey() {
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  chmodSync(stateDir, 0o700);
  if (!existsSync(keyPath)) {
    writeFileSync(keyPath, randomBytes(48).toString("base64url"), {
      mode: 0o600,
      flag: "wx",
    });
  }
  chmodSync(keyPath, 0o600);
  return readFileSync(keyPath, "utf8").trim();
}

function collectPrivateFiles(root) {
  if (!root || !existsSync(root)) return [];
  const files = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory)) {
      const absolute = join(directory, name);
      const info = statSync(absolute, { throwIfNoEntry: false });
      if (!info || info.isSymbolicLink?.()) continue;
      if (info.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!info.isFile()) continue;
      const key = relative(root, absolute);
      if (!key || key.startsWith(`..${sep}`) || key === "..") continue;
      files.push({
        key: key.split(sep).join("/"),
        mode: info.mode & 0o777,
        contents: readFileSync(absolute).toString("base64"),
        sha256: createHash("sha256").update(readFileSync(absolute)).digest("hex"),
      });
    }
  };
  visit(root);
  return files;
}

function validatePrivateFiles(privateFiles) {
  if (!Array.isArray(privateFiles)) return [];
  return privateFiles.map((file) => {
    if (!file?.key || typeof file.contents !== "string") {
      fail("Kopia zawiera niepoprawny wpis prywatnego pliku.");
    }
    const normalized = String(file.key).replaceAll("\\", "/");
    if (
      normalized.startsWith("/") ||
      normalized.split("/").includes("..") ||
      normalized.includes("\0")
    ) {
      fail("Kopia zawiera niebezpieczną ścieżkę pliku.");
    }
    const contents = Buffer.from(file.contents, "base64");
    const sha256 = createHash("sha256").update(contents).digest("hex");
    if (file.sha256 && file.sha256 !== sha256) {
      fail(`Nieprawidłowa suma pliku w kopii: ${normalized}`);
    }
    return {
      key: normalized,
      mode: Number(file.mode) || 0o600,
      contents,
      sha256,
    };
  });
}

function stagePrivateFiles(privateFiles) {
  if (!filesDir) return null;
  const parent = dirname(filesDir);
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const stage = mkdtempSync(join(parent, ".kla-restore-"));
  chmodSync(stage, 0o700);
  for (const file of privateFiles) {
    const target = resolve(stage, file.key);
    if (!target.startsWith(`${stage}${sep}`)) {
      fail("Kopia zawiera niebezpieczną ścieżkę pliku.");
    }
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
    writeFileSync(target, file.contents, { mode: file.mode });
  }
  return stage;
}

function encryptedPayload(payload) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(recoveryKey(), salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const compressed = gzipSync(Buffer.from(JSON.stringify(payload), "utf8"), {
    level: 9,
  });
  const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), ciphertext]);
}

function decryptedPayload(path) {
  const encrypted = readFileSync(path);
  if (!encrypted.subarray(0, MAGIC.length).equals(MAGIC)) {
    fail("To nie jest poprawna kopia eDziennika KLA.");
  }
  let offset = MAGIC.length;
  const salt = encrypted.subarray(offset, (offset += 16));
  const iv = encrypted.subarray(offset, (offset += 12));
  const tag = encrypted.subarray(offset, (offset += 16));
  const ciphertext = encrypted.subarray(offset);
  try {
    const key = scryptSync(recoveryKey(), salt, 32);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const compressed = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return JSON.parse(gunzipSync(compressed).toString("utf8"));
  } catch {
    fail("Kopia jest uszkodzona albo użyto innego klucza odzyskiwania.");
  }
}

async function tableNames(client) {
  const result = await client.query(`
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `);
  return result.rows.map((row) => row.tablename);
}

async function assertDemoDatabase(client) {
  const relation = await client.query(
    "SELECT to_regclass('public.\"School\"') AS school, to_regclass('public.\"User\"') AS users",
  );
  if (!relation.rows[0]?.school || !relation.rows[0]?.users) {
    fail("Baza nie ma kompletnego schematu demonstracyjnego.");
  }
  const schools = await client.query('SELECT "slug" FROM "School"');
  const users = await client.query('SELECT "email" FROM "User"');
  const allDemoSchools = schools.rows.every((row) =>
    String(row.slug).toLowerCase().includes("demo"),
  );
  const allSyntheticUsers = users.rows.every((row) =>
    String(row.email).toLowerCase().endsWith("@invalid.example"),
  );
  if (!allDemoSchools || !allSyntheticUsers) {
    fail(
      "Odmowa odtworzenia: baza zawiera szkołę albo użytkownika spoza danych syntetycznych.",
    );
  }
}

async function createSnapshot(client, label) {
  const tables = [];
  for (const table of await tableNames(client)) {
    const result = await client.query(
      `SELECT to_jsonb(source) AS row FROM ${quoteIdentifier(table)} AS source`,
    );
    tables.push({ name: table, rows: result.rows.map((item) => item.row) });
  }
  const createdAt = new Date();
  const stamp = createdAt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  mkdirSync(snapshotDir, { recursive: true, mode: 0o700 });
  chmodSync(snapshotDir, 0o700);
  const target = join(snapshotDir, `${stamp}-${safeLabel(label)}.kla-snapshot`);
  const payload = {
    format: 2,
    createdAt: createdAt.toISOString(),
    appCommit: process.env.KLA_SNAPSHOT_COMMIT ?? "working-tree",
    tables,
    privateFiles: collectPrivateFiles(filesDir),
  };
  writeFileSync(target, encryptedPayload(payload), { mode: 0o600, flag: "wx" });
  chmodSync(target, 0o600);
  process.stdout.write(`Szyfrowana kopia gotowa: ${target}\n`);
  process.stdout.write(`Klucz odzyskiwania: ${keyPath} (nie wysyłaj go razem z kopią)\n`);
}

async function restoreSnapshot(client, path, confirmed) {
  if (!restoreAllowed) {
    fail(
      "Odtwarzanie jest domyślnie wyłączone. Ustaw KLA_SNAPSHOT_RESTORE_ALLOWED=1 wyłącznie dla kontrolowanej bazy demo.",
    );
  }
  if (!confirmed) {
    fail("Odtworzenie zastępuje dane. Dodaj --confirm po świadomym sprawdzeniu pliku.");
  }
  await assertDemoDatabase(client);
  const payload = decryptedPayload(resolve(path));
  if (![1, 2].includes(payload?.format) || !Array.isArray(payload.tables)) {
    fail("Kopia ma nieobsługiwany format.");
  }
  const available = new Set(await tableNames(client));
  const unknown = payload.tables.filter((table) => !available.has(table.name));
  if (unknown.length) {
    fail("Schemat aplikacji nie pasuje do kopii. Najpierw uruchom migracje.");
  }
  const privateFiles = validatePrivateFiles(payload.privateFiles);
  const stagedFiles = stagePrivateFiles(privateFiles);

  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL session_replication_role = replica");
    const tables = [...available].map(quoteIdentifier).join(", ");
    if (tables) await client.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
    for (const table of payload.tables) {
      if (!Array.isArray(table.rows) || table.rows.length === 0) continue;
      const quoted = quoteIdentifier(table.name);
      await client.query(
        `INSERT INTO ${quoted} SELECT * FROM json_populate_recordset(NULL::${quoted}, $1::json)`,
        [JSON.stringify(table.rows)],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
  if (filesDir && stagedFiles) {
    const previous = `${filesDir}.before-restore-${Date.now()}`;
    try {
      if (existsSync(filesDir)) renameSync(filesDir, previous);
      renameSync(stagedFiles, filesDir);
      chmodSync(filesDir, 0o700);
      if (existsSync(previous)) rmSync(previous, { recursive: true, force: true });
    } catch (error) {
      if (!existsSync(filesDir) && existsSync(previous)) {
        renameSync(previous, filesDir);
      }
      throw error;
    }
  }
  process.stdout.write(`Odtworzono kopię: ${basename(path)}\n`);
}

function verifySnapshot(path) {
  const payload = decryptedPayload(resolve(path));
  if (![1, 2].includes(payload?.format) || !Array.isArray(payload.tables)) {
    fail("Kopia ma nieobsługiwany format.");
  }
  const privateFiles = validatePrivateFiles(payload.privateFiles);
  const rowCount = payload.tables.reduce(
    (total, table) => total + (Array.isArray(table.rows) ? table.rows.length : 0),
    0,
  );
  process.stdout.write(
    `Kopia poprawna: ${basename(path)} · ${payload.tables.length} tabel · ${rowCount} rekordów · ${privateFiles.length} plików prywatnych\n`,
  );
}

const [, , command, value, ...flags] = process.argv;
if (!process.env.DATABASE_URL) fail("Brak DATABASE_URL.");
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10_000,
  query_timeout: 120_000,
});
await client.connect();
try {
  if (command === "create") {
    await createSnapshot(client, value ?? "manual");
  } else if (command === "restore" && value) {
    await restoreSnapshot(client, value, flags.includes("--confirm"));
  } else if (command === "verify" && value) {
    verifySnapshot(value);
  } else {
    fail("Użycie: create NAZWA, verify PLIK albo restore PLIK --confirm");
  }
} finally {
  await client.end();
}
