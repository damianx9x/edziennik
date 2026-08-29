import { createHmac } from "node:crypto";

export type ProtectedActivity = {
  clientCode: string;
  label: string;
  count: number;
  lastAt: Date;
  severity: "critical" | "warning" | "info";
};

function operation(key: string) {
  if (key.includes("/sign-in/email")) return { label: "Logowanie hasłem", sensitive: true };
  if (key.includes("/request-password-reset")) return { label: "Reset hasła", sensitive: true };
  if (key.includes("/sign-up")) return { label: "Próba rejestracji", sensitive: true };
  if (key.includes("two-factor") || key.includes("2fa")) return { label: "Weryfikacja MFA", sensitive: true };
  return { label: "Chroniona operacja", sensitive: false };
}

export function summarizeProtectedActivity(
  rows: Array<{ key: string; count: number; lastRequest: bigint }>,
  secret: string,
): ProtectedActivity[] {
  return rows.map((row): ProtectedActivity => {
    const details = operation(row.key);
    const clientCode = createHmac("sha256", secret || "kla-local-pseudonym")
      .update(row.key.split("|")[0] ?? row.key)
      .digest("hex")
      .slice(0, 8)
      .toUpperCase();
    return {
      clientCode,
      label: details.label,
      count: row.count,
      lastAt: new Date(Number(row.lastRequest)),
      severity: details.sensitive && row.count >= 5
        ? "critical"
        : details.sensitive && row.count >= 3
          ? "warning"
          : "info",
    };
  }).sort((left, right) => right.lastAt.getTime() - left.lastAt.getTime());
}
