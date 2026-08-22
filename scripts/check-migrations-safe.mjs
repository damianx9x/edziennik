import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const migrationsRoot = join(projectRoot, "prisma", "migrations");
const policy = JSON.parse(
  readFileSync(join(projectRoot, "prisma", "migration-policy.json"), "utf8"),
);
const acceptedLegacy = new Set(policy.acceptedLegacyMigrations ?? []);
const destructivePatterns = [
  /\bDROP\s+(?:TABLE|COLUMN|TYPE|CONSTRAINT)\b/i,
  /\bTRUNCATE\b/i,
  /\bRENAME\s+(?:TO|COLUMN)\b/i,
  /\bALTER\s+COLUMN\b[\s\S]{0,120}\bTYPE\b/i,
  /\bALTER\s+COLUMN\b[\s\S]{0,120}\bSET\s+NOT\s+NULL\b/i,
  /\bADD\s+COLUMN\b[\s\S]{0,200}\bNOT\s+NULL\b(?![\s\S]{0,120}\bDEFAULT\b)/i,
];

const findings = [];
for (const migration of readdirSync(migrationsRoot, { withFileTypes: true })) {
  if (!migration.isDirectory() || acceptedLegacy.has(migration.name)) continue;
  const sqlPath = join(migrationsRoot, migration.name, "migration.sql");
  let sql;
  try {
    sql = readFileSync(sqlPath, "utf8");
  } catch {
    continue;
  }
  for (const pattern of destructivePatterns) {
    if (pattern.test(sql)) {
      findings.push(`${migration.name}: ${pattern.source}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Migracja nie spełnia polityki aktualizacji rozszerzających:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  console.error(
    "Podziel zmianę na bezpieczne wydania expand/migrate/contract. Nie dopisuj nowej migracji do listy legacy.",
  );
  process.exit(1);
}

console.log("Migracje: polityka bezpiecznego rollbacku jest zachowana.");
