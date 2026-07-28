import { describe, expect, it } from "vitest";

import { createRecordsCsv, splitPersonName } from "./export";
import { parseImportFile } from "./parser";

describe("records export", () => {
  it("creates a BOM-prefixed, parser-compatible CSV", () => {
    const csv = createRecordsCsv([
      {
        typ: "sala",
        nazwa: 'Cambridge; "parter"',
        pojemnosc: 8,
        lokalizacja: "Przodkowo",
      },
    ]);

    expect(csv.startsWith("\uFEFFtyp;identyfikator")).toBe(true);
    expect(csv).toContain('sala;;;;;;"Cambridge; ""parter""";8');
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("round-trips exported rows through the import parser", async () => {
    const csv = createRecordsCsv([
      {
        typ: "sala",
        nazwa: "Cambridge",
        pojemnosc: 8,
        lokalizacja: "Przodkowo",
      },
      {
        typ: "grupa",
        nazwa: "MONACO",
        poziom: "A2",
        lokalizacja: "Przodkowo",
      },
    ]);
    const preview = await parseImportFile({
      fileName: "kartoteki.csv",
      bytes: new TextEncoder().encode(csv),
    });

    expect(preview).toMatchObject({
      totalRows: 2,
      validRows: 2,
      errorRows: 0,
    });
    expect(preview.rows.map((row) => row.locationName)).toEqual([
      "Przodkowo",
      "Przodkowo",
    ]);
  });

  it("keeps the first word as a first name and the remainder as surname", () => {
    expect(splitPersonName("Anna Maria Kowalska")).toEqual({
      firstName: "Anna",
      lastName: "Maria Kowalska",
    });
    expect(splitPersonName("Lektor")).toEqual({
      firstName: "Lektor",
      lastName: "KLA",
    });
  });
});
