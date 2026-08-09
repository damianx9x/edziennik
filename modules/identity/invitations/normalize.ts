export function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase("pl-PL");
}
