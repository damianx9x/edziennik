#!/usr/bin/env node

import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const confirmed = process.argv.includes("--confirm=EMPTY_FIRST_RUN");
const connectionString = process.env.DATABASE_URL;
const privateFilesDir = process.env.KLA_PRIVATE_FILES_DIR;

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

if (!connectionString) fail("Brak DATABASE_URL.");
if (!confirmed) fail("Wymagane potwierdzenie --confirm=EMPTY_FIRST_RUN.");
if (process.env.KLA_ALLOW_DEMO_RESET !== "1") {
  fail("Operacja jest dozwolona wyłącznie na środowisku demonstracyjnym.");
}
if (!process.env.KLA_BOOTSTRAP_TOKEN_HASH) {
  fail("Najpierw ustaw KLA_BOOTSTRAP_TOKEN_HASH.");
}

const client = new pg.Client({ connectionString });
await client.connect();
try {
  const unsafeSchool = await client.query(
    `SELECT 1 FROM "School" WHERE "slug" NOT ILIKE '%demo%' LIMIT 1`,
  );
  const unsafeUser = await client.query(
    `SELECT 1 FROM "User"
     WHERE "email" NOT LIKE '%@invalid.example'
       AND "email" <> 'bog@owner.kla.internal'
     LIMIT 1`,
  );
  if (unsafeSchool.rowCount || unsafeUser.rowCount) {
    fail("Odmowa: baza nie wygląda jak syntetyczne środowisko demonstracyjne.");
  }

  const tables = await client.query(`
    SELECT tablename FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `);
  const names = tables.rows
    .map(({ tablename }) => `"${String(tablename).replaceAll('"', '""')}"`)
    .join(", ");
  await client.query("BEGIN");
  try {
    if (names) await client.query(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
  if (privateFilesDir) {
    for (const entry of readdirSync(privateFilesDir)) {
      rmSync(join(privateFilesDir, entry), { recursive: true, force: true });
    }
  }
  process.stdout.write("Baza jest pusta i gotowa do pierwszego uruchomienia.\n");
} finally {
  await client.end();
}
