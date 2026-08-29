import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export type CoarseRequestContext = {
  countryCode: string | null;
  regionCode: string | null;
  regionName: string | null;
  clientHash: string | null;
  deviceFamily: string;
  browserFamily: string;
};

function clean(value: string | null, pattern: RegExp, max: number) {
  const candidate = value?.trim().slice(0, max) ?? "";
  return candidate && pattern.test(candidate) ? candidate : null;
}

export function trustedClientIp(headers: Headers) {
  const values = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((value) => value.trim().replace(/^\[|\]$/g, ""))
    .filter((value) => isIP(value));
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (value !== "127.0.0.1" && value !== "::1") return value;
  }
  return null;
}

export function classifyUserAgent(userAgent: string | null) {
  const value = userAgent ?? "";
  const deviceFamily = /bot|crawler|spider/i.test(value)
    ? "Robot"
    : /iPad|Tablet/i.test(value)
      ? "Tablet"
      : /Mobile|iPhone|Android/i.test(value)
        ? "Telefon"
        : value
          ? "Komputer"
          : "Nieznane";
  const browserFamily = /Edg\//i.test(value)
    ? "Edge"
    : /CriOS|Chrome\//i.test(value)
      ? "Chrome"
      : /Firefox|FxiOS/i.test(value)
        ? "Firefox"
        : /Safari/i.test(value)
          ? "Safari"
          : /bot|crawler|spider/i.test(value)
            ? "Robot"
            : "Inna";
  return { deviceFamily, browserFamily };
}

export function getCoarseRequestContext(headers: Headers, secret: string): CoarseRequestContext {
  const ip = trustedClientIp(headers);
  const countryCode = clean(headers.get("cf-ipcountry"), /^[A-Z]{2}$/, 2);
  const regionCode = clean(headers.get("cf-region-code"), /^[A-Za-z0-9-]+$/, 12);
  const regionName = clean(headers.get("cf-region"), /^[\p{L} .'-]+$/u, 80);
  const { deviceFamily, browserFamily } = classifyUserAgent(headers.get("user-agent"));
  return {
    countryCode,
    regionCode,
    regionName,
    clientHash: ip && secret
      ? createHmac("sha256", secret).update(ip).digest("hex").slice(0, 16)
      : null,
    deviceFamily,
    browserFamily,
  };
}
