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

function firstForwardedValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

export function isSameOriginPageVisit(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const requestUrl = new URL(request.url);
  const host =
    firstForwardedValue(request.headers.get("x-forwarded-host")) ??
    request.headers.get("host") ??
    requestUrl.host;
  const protocol =
    firstForwardedValue(request.headers.get("x-forwarded-proto")) ??
    requestUrl.protocol.slice(0, -1);

  if (protocol !== "http" && protocol !== "https") return false;

  try {
    return origin === new URL(`${protocol}://${host}`).origin;
  } catch {
    return false;
  }
}
