const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const polishPhonePattern =
  /(?<!\d)(?:\+?48[\s-]?)?(?:\d[\s-]?){9}(?!\d)/g;
const secretPattern =
  /\b(?:bearer\s+)?(?:sk-[A-Za-z0-9_-]{12,}|[A-Za-z0-9_-]{32,})\b/gi;
const sensitiveQueryPattern =
  /([?&](?:token|code|secret|password|email|phone)=)[^&#\s]*/gi;

export function sanitizeDiagnosticText(value: unknown): string {
  const source =
    value instanceof Error
      ? `${value.name}: ${value.message}`
      : typeof value === "string"
        ? value
        : safeStringify(value);

  return source
    .replace(emailPattern, "[email]")
    .replace(polishPhonePattern, "[telefon]")
    .replace(secretPattern, "[sekret]")
    .replace(sensitiveQueryPattern, "$1[ukryte]")
    .slice(0, 1200);
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "[wartość niemożliwa do zapisania]";
  }
}
