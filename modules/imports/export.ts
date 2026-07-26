export const importExportHeaders = [
  "typ",
  "identyfikator",
  "imie",
  "nazwisko",
  "email",
  "telefon",
  "nazwa",
  "pojemnosc",
  "poziom",
  "grupa",
  "rodzic_email",
  "dziecko_id",
] as const;

export type ExportRow = Partial<
  Record<(typeof importExportHeaders)[number], string | number | null>
>;

export function createRecordsCsv(rows: readonly ExportRow[]): string {
  const lines = [
    importExportHeaders.map(escapeCsvCell).join(";"),
    ...rows.map((row) =>
      importExportHeaders
        .map((header) => escapeCsvCell(row[header] ?? ""))
        .join(";"),
    ),
  ];

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function splitPersonName(name: string): {
  firstName: string;
  lastName: string;
} {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() ?? "Osoba",
    lastName: parts.join(" ") || "KLA",
  };
}

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (!/[;"\r\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}
