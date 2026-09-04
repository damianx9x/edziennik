const nonIdentifierCharacters = /[^A-Z0-9]/g;

function identifierPart(value: string): string {
  return value
    .replaceAll("Ł", "L")
    .replaceAll("ł", "l")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("pl-PL")
    .replace(nonIdentifierCharacters, "");
}

/**
 * Builds the short, human-readable identifier used by the school directory.
 * Example: Jan Kowalski -> JKOW. Uniqueness is added separately because it
 * depends on the current school's records.
 */
export function buildStudentExternalIdBase(
  firstName: string,
  lastName: string,
): string {
  const first = identifierPart(firstName).slice(0, 1);
  const last = identifierPart(lastName).slice(0, 3);
  return `${first}${last}` || "UCZ";
}

export function nextAvailableExternalId(
  base: string,
  existingIds: readonly (string | null)[],
): string {
  const used = new Set(
    existingIds
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLocaleUpperCase("pl-PL")),
  );
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
}
