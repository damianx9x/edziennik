import { readSheet } from "read-excel-file/node";
import { z } from "zod";

const MAX_IMPORT_ROWS = 1_000;
const MAX_IMPORT_COLUMNS = 30;
const MAX_CELL_LENGTH = 500;

const entityAliases = {
  sala: "ROOM",
  room: "ROOM",
  wykladowca: "TEACHER",
  nauczyciel: "TEACHER",
  teacher: "TEACHER",
  grupa: "GROUP",
  group: "GROUP",
  uczen: "STUDENT",
  student: "STUDENT",
  rodzic: "PARENT",
  parent: "PARENT",
  relacja: "RELATION",
  relation: "RELATION",
} as const;

const headerAliases = {
  typ: "entity",
  type: "entity",
  identyfikator: "externalId",
  id: "externalId",
  external_id: "externalId",
  imie: "firstName",
  first_name: "firstName",
  nazwisko: "lastName",
  last_name: "lastName",
  email: "email",
  telefon: "phone",
  phone: "phone",
  nazwa: "name",
  name: "name",
  pojemnosc: "capacity",
  capacity: "capacity",
  poziom: "level",
  level: "level",
  lokalizacja: "locationName",
  location: "locationName",
  grupa: "groupName",
  group_name: "groupName",
  rodzic_email: "parentEmail",
  parent_email: "parentEmail",
  dziecko_id: "childExternalId",
  child_id: "childExternalId",
} as const;

const cefrLevels = [
  "PRE_A1",
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "MIXED",
] as const;

const emailSchema = z.email().max(254);

export type ImportEntity =
  | "ROOM"
  | "TEACHER"
  | "GROUP"
  | "STUDENT"
  | "PARENT"
  | "RELATION";

export type ImportRow = {
  rowNumber: number;
  entity: ImportEntity;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  name?: string;
  capacity?: number;
  level?: (typeof cefrLevels)[number];
  locationName?: string;
  groupName?: string;
  parentEmail?: string;
  childExternalId?: string;
};

export type ImportIssue = {
  rowNumber: number;
  field?: string;
  code:
    | "EMPTY_FILE"
    | "MISSING_HEADER"
    | "UNKNOWN_ENTITY"
    | "INVALID_VALUE"
    | "DUPLICATE";
  message: string;
};

export type ImportPreview = {
  rows: ImportRow[];
  issues: ImportIssue[];
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
};

type CanonicalHeader = (typeof headerAliases)[keyof typeof headerAliases];
type CanonicalRow = Partial<Record<CanonicalHeader, string>>;

export async function parseImportFile(input: {
  fileName: string;
  bytes: Uint8Array;
}): Promise<ImportPreview> {
  const extension = input.fileName.toLocaleLowerCase("pl-PL").split(".").pop();
  let table: unknown[][];

  if (extension === "csv") {
    table = parseDelimitedText(new TextDecoder("utf-8").decode(input.bytes));
  } else if (extension === "xlsx") {
    table = await readSheet(Buffer.from(input.bytes));
  } else {
    throw new Error("Wybierz plik CSV albo XLSX.");
  }

  return createImportPreview(table);
}

export function createImportPreview(table: unknown[][]): ImportPreview {
  if (table.length < 2) {
    return {
      rows: [],
      issues: [
        {
          rowNumber: 1,
          code: "EMPTY_FILE",
          message: "Plik nie zawiera danych do importu.",
        },
      ],
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      duplicateRows: 0,
    };
  }

  if (table.length - 1 > MAX_IMPORT_ROWS) {
    throw new Error(
      `Jeden import może mieć maksymalnie ${MAX_IMPORT_ROWS} wierszy.`,
    );
  }
  if (table.some((row) => row.length > MAX_IMPORT_COLUMNS)) {
    throw new Error(
      `Jeden import może mieć maksymalnie ${MAX_IMPORT_COLUMNS} kolumn.`,
    );
  }

  const issues: ImportIssue[] = [];
  const headers = table[0].map((value) => {
    const normalized = normalizeKey(toCellString(value));
    return headerAliases[normalized as keyof typeof headerAliases];
  });
  const entityColumn = headers.indexOf("entity");

  if (entityColumn === -1) {
    issues.push({
      rowNumber: 1,
      field: "typ",
      code: "MISSING_HEADER",
      message: "Brakuje kolumny „typ”. Pobierz szablon i spróbuj ponownie.",
    });
  }

  const rows: ImportRow[] = [];
  const invalidRowNumbers = new Set<number>();
  const duplicateRowNumbers = new Set<number>();
  const seenKeys = new Map<string, number>();

  table.slice(1).forEach((sourceRow, rowIndex) => {
    const rowNumber = rowIndex + 2;
    if (sourceRow.every((value) => toCellString(value) === "")) return;

    const canonical: CanonicalRow = {};
    headers.forEach((header, columnIndex) => {
      if (!header) return;
      canonical[header] = toCellString(sourceRow[columnIndex]);
    });

    const entityKey = normalizeKey(canonical.entity ?? "");
    const entity =
      entityAliases[entityKey as keyof typeof entityAliases] ?? undefined;
    if (!entity) {
      addIssue({
        issues,
        invalidRowNumbers,
        rowNumber,
        field: "typ",
        code: "UNKNOWN_ENTITY",
        message:
          "Typ musi mieć wartość: sala, wykladowca, grupa, uczen, rodzic albo relacja.",
      });
      return;
    }

    const row: ImportRow = { rowNumber, entity };
    const textFields = [
      "externalId",
      "firstName",
      "lastName",
      "email",
      "phone",
      "name",
      "locationName",
      "groupName",
      "parentEmail",
      "childExternalId",
    ] as const;
    textFields.forEach((field) => {
      const value = canonical[field]?.trim();
      if (value) row[field] = value.slice(0, MAX_CELL_LENGTH);
    });
    if (row.email) row.email = normalizeEmail(row.email);
    if (row.parentEmail) row.parentEmail = normalizeEmail(row.parentEmail);

    validateRow(row, issues, invalidRowNumbers, canonical);
    const duplicateKey = getDuplicateKey(row);
    if (duplicateKey) {
      const previousRow = seenKeys.get(duplicateKey);
      if (previousRow) {
        duplicateRowNumbers.add(rowNumber);
        addIssue({
          issues,
          invalidRowNumbers,
          rowNumber,
          code: "DUPLICATE",
          message: `Duplikat wiersza ${previousRow}. Zostaw tylko jedną pozycję.`,
        });
      } else {
        seenKeys.set(duplicateKey, rowNumber);
      }
    }

    rows.push(row);
  });

  return {
    rows,
    issues,
    totalRows: rows.length,
    validRows: rows.filter((row) => !invalidRowNumbers.has(row.rowNumber))
      .length,
    errorRows: invalidRowNumbers.size,
    duplicateRows: duplicateRowNumbers.size,
  };
}

function validateRow(
  row: ImportRow,
  issues: ImportIssue[],
  invalidRows: Set<number>,
  canonical: CanonicalRow,
) {
  const requiredText = (
    field: keyof ImportRow,
    label: string,
    minimum = 2,
  ) => {
    const value = row[field];
    if (typeof value !== "string" || value.trim().length < minimum) {
      addIssue({
        issues,
        invalidRowNumbers: invalidRows,
        rowNumber: row.rowNumber,
        field: String(field),
        code: "INVALID_VALUE",
        message: `Uzupełnij pole „${label}”.`,
      });
    }
  };
  const validEmail = (field: "email" | "parentEmail", label: string) => {
    const value = row[field];
    if (!value || !emailSchema.safeParse(value).success) {
      addIssue({
        issues,
        invalidRowNumbers: invalidRows,
        rowNumber: row.rowNumber,
        field,
        code: "INVALID_VALUE",
        message: `Wpisz poprawny adres w polu „${label}”.`,
      });
    }
  };

  if (row.entity === "ROOM") {
    requiredText("name", "nazwa");
    if (canonical.capacity) {
      const capacity = Number(canonical.capacity.replace(",", "."));
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
        addIssue({
          issues,
          invalidRowNumbers: invalidRows,
          rowNumber: row.rowNumber,
          field: "capacity",
          code: "INVALID_VALUE",
          message: "Pojemność sali musi być liczbą od 1 do 100.",
        });
      } else {
        row.capacity = capacity;
      }
    }
    return;
  }

  if (row.entity === "GROUP") {
    requiredText("name", "nazwa");
    const level = normalizeLevel(canonical.level);
    if (canonical.level && !level) {
      addIssue({
        issues,
        invalidRowNumbers: invalidRows,
        rowNumber: row.rowNumber,
        field: "level",
        code: "INVALID_VALUE",
        message: "Poziom musi mieć wartość PRE_A1, A1–C2 albo MIXED.",
      });
    } else {
      row.level = level ?? "MIXED";
    }
    return;
  }

  if (row.entity === "TEACHER" || row.entity === "PARENT") {
    requiredText("firstName", "imię");
    requiredText("lastName", "nazwisko");
    validEmail("email", "email");
    return;
  }

  if (row.entity === "STUDENT") {
    requiredText("externalId", "identyfikator");
    requiredText("firstName", "imię");
    requiredText("lastName", "nazwisko");
    if (row.email && !emailSchema.safeParse(row.email).success) {
      addIssue({
        issues,
        invalidRowNumbers: invalidRows,
        rowNumber: row.rowNumber,
        field: "email",
        code: "INVALID_VALUE",
        message: "E-mail ucznia jest opcjonalny, ale musi mieć poprawny format.",
      });
    }
    return;
  }

  validEmail("parentEmail", "rodzic_email");
  requiredText("childExternalId", "dziecko_id");
}

function getDuplicateKey(row: ImportRow): string | undefined {
  if (row.entity === "ROOM" || row.entity === "GROUP") {
    return `${row.entity}:${normalizeKey(row.name ?? "")}`;
  }
  if (row.entity === "STUDENT") {
    return `${row.entity}:${normalizeKey(row.externalId ?? "")}:${normalizeKey(row.groupName ?? "")}`;
  }
  if (row.entity === "RELATION") {
    return `${row.entity}:${row.parentEmail}:${normalizeKey(row.childExternalId ?? "")}`;
  }
  return row.email ? `${row.entity}:${row.email}` : undefined;
}

function addIssue(input: {
  issues: ImportIssue[];
  invalidRowNumbers: Set<number>;
  rowNumber: number;
  field?: string;
  code: ImportIssue["code"];
  message: string;
}) {
  input.invalidRowNumbers.add(input.rowNumber);
  input.issues.push({
    rowNumber: input.rowNumber,
    field: input.field,
    code: input.code,
    message: input.message,
  });
}

function normalizeEmail(value: string): string {
  return value.trim().toLocaleLowerCase("pl-PL");
}

function normalizeLevel(
  value: string | undefined,
): (typeof cefrLevels)[number] | undefined {
  if (!value) return undefined;
  const normalized = normalizeKey(value).toLocaleUpperCase("pl-PL");
  const withSeparator = normalized === "PREA1" ? "PRE_A1" : normalized;
  return cefrLevels.includes(withSeparator as (typeof cefrLevels)[number])
    ? (withSeparator as (typeof cefrLevels)[number])
    : undefined;
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "_")
    .toLocaleLowerCase("pl-PL");
}

function toCellString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  const text = String(value).trim();
  return /^'[\t\r ]*[=+\-@]/.test(text) ? text.slice(1) : text;
}

export function parseDelimitedText(input: string): string[][] {
  const source = input.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(source);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (!quoted && character === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += character;
    if (cell.length > MAX_CELL_LENGTH) {
      throw new Error(
        `Jedna komórka może mieć maksymalnie ${MAX_CELL_LENGTH} znaków.`,
      );
    }
  }
  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function detectDelimiter(input: string): "," | ";" | "\t" {
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const counts = [
    { delimiter: ";" as const, count: firstLine.split(";").length },
    { delimiter: "," as const, count: firstLine.split(",").length },
    { delimiter: "\t" as const, count: firstLine.split("\t").length },
  ];
  return counts.sort((left, right) => right.count - left.count)[0].delimiter;
}
