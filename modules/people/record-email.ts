import { createHash } from "node:crypto";

export function createRecordOnlyEmail(
  schoolId: string,
  externalId: string,
): string {
  const digest = createHash("sha256")
    .update(`${schoolId}:${externalId.trim().toLocaleLowerCase("pl-PL")}`)
    .digest("hex")
    .slice(0, 28);
  return `record.${digest}@invalid.example`;
}
