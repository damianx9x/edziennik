import { randomBytes } from "node:crypto";

const AMBIGUOUS = /[0O1Il]/g;

export function generateTemporaryPassword(): string {
  const random = randomBytes(18)
    .toString("base64url")
    .replace(AMBIGUOUS, "x")
    .slice(0, 20);

  return `${random}aA7!`;
}

export const temporaryPasswordLifetimeMinutes = 30;
