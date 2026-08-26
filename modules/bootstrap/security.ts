import { createHash, timingSafeEqual } from "node:crypto";

import { resolveEmailProvider } from "../identity/email/provider-config";

export function hashSetupCode(value: string): Buffer {
  return createHash("sha256").update(value.trim(), "utf8").digest();
}

export function isSetupCodeValid(value: string, expectedHex?: string): boolean {
  if (!expectedHex || !/^[a-f0-9]{64}$/i.test(expectedHex)) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = hashSetupCode(value);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function isTransactionalEmailConfigured(
  environment: Record<string, string | undefined> = process.env,
): boolean {
  return resolveEmailProvider(environment) !== null;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "podany adres";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}
