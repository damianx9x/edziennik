import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

import {
  createImportPreview,
  parseDelimitedText,
  parseImportFile,
} from "./parser";

describe("import parser", () => {
  it("keeps the public KLA template valid", async () => {
    const bytes = await readFile(
      new URL("../../public/szablon-importu-kla.csv", import.meta.url),
    );
    const preview = await parseImportFile({
      fileName: "szablon-importu-kla.csv",
      bytes,
    });

    expect(preview).toMatchObject({
      totalRows: 6,
      validRows: 6,
      errorRows: 0,
      duplicateRows: 0,
    });
  });

  it("parses a quoted semicolon CSV and validates all supported records", async () => {
    const csv = [
      "typ;identyfikator;imie;nazwisko;email;telefon;nazwa;pojemnosc;poziom;grupa;rodzic_email;dziecko_id",
      'sala;;;;;;"Cambridge; parter";8;;;;',
      "grupa;;;;;;MONACO;;A2;;;",
      "wykladowca;;Demo;Lektor;teacher@invalid.example;;;;;;;",
      "uczen;STU-001;Demo;Uczeń;;;;;;MONACO;;",
      "rodzic;;Demo;Rodzic;parent@invalid.example;;;;;;;",
      "relacja;;;;;;;;;;parent@invalid.example;STU-001",
    ].join("\n");

    const preview = await parseImportFile({
      fileName: "kla.csv",
      bytes: new TextEncoder().encode(csv),
    });

    expect(preview).toMatchObject({
      totalRows: 6,
      validRows: 6,
      errorRows: 0,
      duplicateRows: 0,
    });
    expect(preview.rows[0]).toMatchObject({
      entity: "ROOM",
      name: "Cambridge; parter",
      capacity: 8,
    });
  });

  it("reports invalid values and duplicates without exposing another row", () => {
    const preview = createImportPreview([
      ["typ", "identyfikator", "imie", "nazwisko", "email"],
      ["uczen", "STU-001", "Uczeń", "Demo", ""],
      ["uczen", "STU-001", "Drugi", "Demo", ""],
      ["rodzic", "", "Rodzic", "Demo", "not-an-email"],
      ["cos-innego", "", "", "", ""],
    ]);

    expect(preview.totalRows).toBe(3);
    expect(preview.validRows).toBe(1);
    expect(preview.errorRows).toBe(3);
    expect(preview.duplicateRows).toBe(1);
    expect(preview.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "DUPLICATE",
        "INVALID_VALUE",
        "UNKNOWN_ENTITY",
      ]),
    );
  });

  it("handles commas, newlines and escaped quotes in CSV cells", () => {
    expect(parseDelimitedText('typ,nazwa\nsala,"Sala ""A"", piętro"\n')).toEqual([
      ["typ", "nazwa"],
      ["sala", 'Sala "A", piętro'],
    ]);
  });
});
