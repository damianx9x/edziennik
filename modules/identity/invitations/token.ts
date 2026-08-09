import { createHash, randomBytes } from "node:crypto";

export { normalizeEmail } from "./normalize";

export function createInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  const hidden = "•".repeat(Math.max(3, local.length - visible.length));
  return `${visible}${hidden}@${domain}`;
}
