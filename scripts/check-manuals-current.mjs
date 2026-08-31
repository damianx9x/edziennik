import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const release = JSON.parse(await readFile(path.join(root, "manuals", "release.json"), "utf8"));
const manuals = [
  ["school", "Instrukcja_eDziennika_KLA_dla_szkoly.pdf"],
  ["owner", "Instrukcja_eDziennika_KLA_dla_wlasciciela_systemu.pdf"],
];

for (const [audience, file] of manuals) {
  const pdf = await readFile(path.join(root, "output", "pdf", file));
  const metadata = pdf.toString("latin1");
  const expected = `KLA-MANUAL:${release.version}:${audience}`;
  if (!metadata.includes(expected)) {
    throw new Error(`${file} nie odpowiada wersji ${release.version}. Uruchom npm run manuals:build.`);
  }
}

if (!Array.isArray(release.schoolChanges) || release.schoolChanges.length === 0) {
  throw new Error("Pierwsza strona instrukcji szkoły musi zawierać listę zmian.");
}
if (!Array.isArray(release.ownerChanges) || release.ownerChanges.length === 0) {
  throw new Error("Pierwsza strona podręcznika właściciela musi zawierać listę zmian.");
}

console.log(`Podręczniki PDF są aktualne: ${release.version}.`);
