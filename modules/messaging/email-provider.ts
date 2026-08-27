import { sendAuthEmail } from "../identity/email/email-provider";
import { resolveEmailProvider } from "../identity/email/provider-config";

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
};

export type EmailResult = { ok: true } | { ok: false; code: string };

export interface EmailProvider {
  send(payload: EmailPayload): Promise<EmailResult>;
}

type EmailProviderEnvironment = Partial<Record<
  | "KLA_EMAIL_API_URL"
  | "KLA_EMAIL_API_TOKEN"
  | "KLA_EMAIL_FROM"
  | "KLA_EMAIL_API_ALLOWED_HOSTS"
  | "KLA_EMAIL_API_TIMEOUT_MS",
  string
>>;

type FetchImplementation = typeof fetch;

const DEFAULT_TIMEOUT_MS = 10_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 30_000;

function parseTimeout(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, parsed));
}

function parseAllowedHosts(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function resolveEmailProviderEndpoint(
  environment: EmailProviderEnvironment,
): { ok: true; endpoint: URL } | { ok: false; code: string } {
  if (
    !environment.KLA_EMAIL_API_URL ||
    !environment.KLA_EMAIL_API_TOKEN ||
    !environment.KLA_EMAIL_FROM
  ) {
    return { ok: false, code: "PROVIDER_NOT_CONFIGURED" };
  }

  let endpoint: URL;
  try {
    endpoint = new URL(environment.KLA_EMAIL_API_URL);
  } catch {
    return { ok: false, code: "PROVIDER_INVALID_URL" };
  }

  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.hash
  ) {
    return { ok: false, code: "PROVIDER_INVALID_URL" };
  }

  const allowedHosts = parseAllowedHosts(
    environment.KLA_EMAIL_API_ALLOWED_HOSTS,
  );
  if (
    allowedHosts.size > 0 &&
    !allowedHosts.has(endpoint.hostname.toLowerCase())
  ) {
    return { ok: false, code: "PROVIDER_HOST_NOT_ALLOWED" };
  }

  return { ok: true, endpoint };
}

export class HttpEmailProvider implements EmailProvider {
  constructor(
    private readonly environment: EmailProviderEnvironment =
      process.env as EmailProviderEnvironment,
    private readonly fetchImplementation: FetchImplementation = fetch,
  ) {}

  async send(payload: EmailPayload): Promise<EmailResult> {
    if (resolveEmailProvider(this.environment as NodeJS.ProcessEnv)) {
      try {
        const result = await sendAuthEmail({
          to: payload.to,
          subject: payload.subject,
          text: payload.text,
          category: "message",
        });
        return result === "sent" ? { ok: true } : { ok: false, code: "PROVIDER_NOT_CONFIGURED" };
      } catch {
        return { ok: false, code: "SMTP_ERROR" };
      }
    }
    const resolved = resolveEmailProviderEndpoint(this.environment);
    if (!resolved.ok) return resolved;

    try {
      const response = await this.fetchImplementation(resolved.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.environment.KLA_EMAIL_API_TOKEN}`,
          "idempotency-key": payload.idempotencyKey,
        },
        body: JSON.stringify({
          from: this.environment.KLA_EMAIL_FROM,
          to: payload.to,
          subject: payload.subject,
          text: payload.text,
        }),
        redirect: "error",
        signal: AbortSignal.timeout(
          parseTimeout(this.environment.KLA_EMAIL_API_TIMEOUT_MS),
        ),
      });
      return response.ok
        ? { ok: true }
        : { ok: false, code: `HTTP_${response.status}` };
    } catch (error) {
      if (
        error instanceof DOMException &&
        ["AbortError", "TimeoutError"].includes(error.name)
      ) {
        return { ok: false, code: "TIMEOUT" };
      }
      return { ok: false, code: "NETWORK_ERROR" };
    }
  }
}

export const emailProvider: EmailProvider = new HttpEmailProvider();
