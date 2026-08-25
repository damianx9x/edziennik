#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const mode = process.argv.includes("--clean") ? "clean" : "rich";
const confirmed = process.argv.includes("--confirm=RESET_SYNTHETIC_DEMO");
const connectionString = process.env.DATABASE_URL;
const privateFilesDir = resolve(
  process.env.KLA_PRIVATE_FILES_DIR ??
    `${process.env.HOME ?? "."}/Library/Application Support/KLA Demo Host/private-files`,
);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
  });
  if (result.status !== 0) fail(`Polecenie zakończyło się błędem: ${command}`);
}

if (!connectionString) fail("Brak DATABASE_URL.");
if (!confirmed) {
  fail(
    "Reset usuwa dane demonstracyjne. Użyj --confirm=RESET_SYNTHETIC_DEMO po sprawdzeniu środowiska.",
  );
}
if (process.env.KLA_ALLOW_DEMO_RESET !== "1") {
  fail("Reset jest zablokowany. Ustaw KLA_ALLOW_DEMO_RESET=1 tylko na środowisku demo.");
}

const client = new pg.Client({
  connectionString,
  connectionTimeoutMillis: 10_000,
  query_timeout: 120_000,
});
await client.connect();
try {
  const relation = await client.query(
    "SELECT to_regclass('public.\"School\"') AS school, to_regclass('public.\"User\"') AS users",
  );
  if (!relation.rows[0]?.school || !relation.rows[0]?.users) {
    fail("Baza nie ma kompletnego schematu demonstracyjnego.");
  }
  const schools = await client.query('SELECT "slug" FROM "School"');
  const users = await client.query('SELECT "email" FROM "User"');
  if (
    !schools.rows.every((row) => String(row.slug).toLowerCase().includes("demo")) ||
    !users.rows.every((row) =>
      String(row.email).toLowerCase().endsWith("@invalid.example"),
    )
  ) {
    fail("Odmowa resetu: baza zawiera dane, które nie wyglądają na syntetyczne demo.");
  }

  run(
    process.execPath,
    ["--env-file=.env", "scripts/demo-database-snapshot.mjs", "create", `before-${mode}-reset`],
    { KLA_SNAPSHOT_FILES_DIR: privateFilesDir },
  );

  const tables = await client.query(`
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `);
  const quoted = tables.rows
    .map((row) => `"${String(row.tablename).replaceAll('"', '""')}"`)
    .join(", ");
  await client.query("BEGIN");
  try {
    if (quoted) {
      await client.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
  rmSync(privateFilesDir, { recursive: true, force: true });
} finally {
  await client.end();
}

run("npm", ["run", "db:seed:demo"], {
  KLA_DEMO_SEED_MODE: mode,
  KLA_PRIVATE_FILES_DIR: privateFilesDir,
});
process.stdout.write(
  `Baza demo została przygotowana w trybie ${mode === "clean" ? "czystym" : "pełnym"}.\n`,
);
