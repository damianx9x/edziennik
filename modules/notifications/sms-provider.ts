import "server-only";

type SmsResult = { ok: true; accepted: number } | { ok: false; code: string };

function normalizePhone(value: string): string | null {
  const phone = value.replace(/[\s()-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

export async function sendSms(input: { phoneNumbers: string[]; text: string }): Promise<SmsResult> {
  if (process.env.SMS_PROVIDER !== "sms-gate") return { ok: false, code: "PROVIDER_DISABLED" };
  const username = process.env.SMS_GATE_USERNAME;
  const password = process.env.SMS_GATE_PASSWORD;
  const endpointValue = process.env.SMS_GATE_URL ?? "https://api.sms-gate.app/3rdparty/v1/messages";
  if (!username || !password) return { ok: false, code: "PROVIDER_NOT_CONFIGURED" };
  let endpoint: URL;
  try { endpoint = new URL(endpointValue); } catch { return { ok: false, code: "INVALID_URL" }; }
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.hash) return { ok: false, code: "INVALID_URL" };
  const phoneNumbers = [...new Set(input.phoneNumbers.map(normalizePhone).filter((value): value is string => Boolean(value)))].slice(0, 50);
  if (!phoneNumbers.length) return { ok: false, code: "NO_VALID_PHONE" };
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}` },
      body: JSON.stringify({ textMessage: { text: input.text.slice(0, 600) }, phoneNumbers, ttl: 3600, priority: 100 }),
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });
    return response.ok ? { ok: true, accepted: phoneNumbers.length } : { ok: false, code: `HTTP_${response.status}` };
  } catch { return { ok: false, code: "NETWORK_ERROR" }; }
}
