export function isTrustedSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || new URL(request.url).protocol.replace(":", "");
  if (!origin || !host || (protocol !== "http" && protocol !== "https")) return false;
  try {
    return new URL(origin).origin === `${protocol}://${host}`;
  } catch {
    return false;
  }
}
