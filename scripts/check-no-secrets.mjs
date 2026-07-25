import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";

const fileList = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);

const textExtensions = new Set([
  ".css",
  ".env",
  ".example",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".prisma",
  ".sh",
  ".ts",
  ".tsx",
  ".yml",
  ".yaml",
]);

const secretPatterns = [
  { label: "private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { label: "OpenAI API key", pattern: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/ },
  { label: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { label: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
];

const findings = [];

for (const file of fileList) {
  if (file === ".env" || /^\.env\.(?!example$)/.test(file)) {
    findings.push(`${file}: plik środowiskowy nie może trafić do repozytorium`);
    continue;
  }

  let stats;
  try {
    stats = statSync(file);
  } catch {
    continue;
  }

  if (!stats.isFile() || stats.size > 1_000_000) {
    continue;
  }

  const extension = extname(file);
  if (!textExtensions.has(extension) && file !== "Dockerfile") {
    continue;
  }

  const contents = readFileSync(file, "utf8");
  for (const { label, pattern } of secretPatterns) {
    if (pattern.test(contents)) {
      findings.push(`${file}: wykryto wzorzec „${label}”`);
    }
  }
}

if (findings.length > 0) {
  console.error("Kontrola sekretów nie przeszła:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log(`Kontrola sekretów: OK (${fileList.length} plików).`);
