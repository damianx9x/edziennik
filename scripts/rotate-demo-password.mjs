import { randomBytes } from "node:crypto";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(projectDir, ".env");
const envContents = readFileSync(envPath, "utf8");
const password = `KLA-Demo-${randomBytes(24).toString("base64url")}`;

const seed = spawnSync(process.execPath, ["scripts/seed-server-demo.mjs"], {
  cwd: projectDir,
  env: { ...process.env, KLA_DEMO_PASSWORD: password },
  stdio: "inherit",
});

if (seed.status !== 0) {
  throw new Error(
    "Nie udało się zaktualizować kont demo. Plik .env pozostał bez zmian.",
  );
}

const passwordLine = `KLA_DEMO_PASSWORD="${password}"`;
const updatedEnv = /^KLA_DEMO_PASSWORD=.*$/m.test(envContents)
  ? envContents.replace(/^KLA_DEMO_PASSWORD=.*$/m, passwordLine)
  : `${envContents.trimEnd()}\n${passwordLine}\n`;

writeFileSync(envPath, updatedEnv, { mode: 0o600 });
chmodSync(envPath, 0o600);
console.log(
  "Hasło kont demo zostało obrócone i zapisane wyłącznie w prywatnym .env.",
);
