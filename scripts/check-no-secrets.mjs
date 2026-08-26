import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

function packageFileList() {
  const excludedDirectories = new Set([
    ".data",
    ".git",
    ".next",
    "app/generated",
    "node_modules",
    "outputs",
  ]);
  const files = [];

  function walk(directory = ".") {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = directory === "." ? entry.name : join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!excludedDirectories.has(path)) walk(path);
      } else if (entry.isFile()) {
        files.push(path);
      }
    }
  }

  walk();
  return files;
}

let fileList;
try {
  fileList = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  )
    .split("\0")
    .filter(Boolean);
} catch {
  fileList = packageFileList();
}

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
  if (!textExtensions.has(extension) && !file.endsWith("Dockerfile")) {
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
