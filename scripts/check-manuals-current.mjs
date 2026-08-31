import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const release = JSON.parse(await readFile(path.join(root, "manuals", "release.json"), "utf8"));
const manuals = [
  ["director", "Podrecznik_eDziennika_KLA_dla_dyrektora.pdf"],
  ["teacher", "Podrecznik_eDziennika_KLA_dla_wykladowcy.pdf"],
  ["parent", "Podrecznik_eDziennika_KLA_dla_rodzica.pdf"],
  ["student", "Podrecznik_eDziennika_KLA_dla_ucznia.pdf"],
  ["owner", "Instrukcja_eDziennika_KLA_dla_wlasciciela_systemu.pdf"],
];

for (const [audience, file] of manuals) {
  const pdf = await readFile(path.join(root, "output", "pdf", file));
  const metadata = pdf.toString("latin1");
  const expected = `KLA-MANUAL:${release.version}:${audience}`;
  if (!metadata.includes(expected)) {
    throw new Error(`${file} nie odpowiada wersji ${release.version}. Uruchom npm run manuals:build.`);
  }
  if (pdf.byteLength < 100_000) {
    throw new Error(`${file} jest podejrzanie krótki (${pdf.byteLength} B).`);
  }
}

if (!Array.isArray(release.schoolChanges) || release.schoolChanges.length === 0) {
  throw new Error("Pierwsza strona instrukcji szkoły musi zawierać listę zmian.");
}
if (!Array.isArray(release.ownerChanges) || release.ownerChanges.length === 0) {
  throw new Error("Pierwsza strona podręcznika właściciela musi zawierać listę zmian.");
}

console.log(`Pięć podręczników PDF jest aktualnych: ${release.version}.`);
