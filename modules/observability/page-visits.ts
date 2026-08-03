export const trackedPagePaths = new Set([
  "/",
  "/panel",
  "/panel/bezpieczenstwo/2fa",
  "/panel/bog",
  "/panel/bog/logi",
  "/panel/logowanie",
  "/panel/szkola",
  "/panel/szkola/importy",
  "/panel/szkola/kartoteki",
  "/panel/szkola/zaproszenia",
  "/panel/szkola/narzedzia",
  "/panel/szkola/narzedzia/strona",
  "/panel/szkola/powiadomienia",
  "/panel/szkola/statystyki",
  "/panel/plan",
  "/panel/rodzic",
  "/panel/uczen",
]);

export function isTrackedPagePath(value: unknown): value is string {
  return typeof value === "string" && trackedPagePaths.has(value);
}

export function pageVisitHourlyLimit(authenticated: boolean) {
  return authenticated ? 180 : 300;
}
