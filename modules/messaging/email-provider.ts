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

class HttpEmailProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<EmailResult> {
    const endpoint = process.env.KLA_EMAIL_API_URL;
    const token = process.env.KLA_EMAIL_API_TOKEN;
    const from = process.env.KLA_EMAIL_FROM;
    if (!endpoint || !token || !from) return { ok: false, code: "PROVIDER_NOT_CONFIGURED" };
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}`, "idempotency-key": payload.idempotencyKey },
        body: JSON.stringify({ from, to: payload.to, subject: payload.subject, text: payload.text }),
      });
      return response.ok ? { ok: true } : { ok: false, code: `HTTP_${response.status}` };
    } catch {
      return { ok: false, code: "NETWORK_ERROR" };
    }
  }
}

export const emailProvider: EmailProvider = new HttpEmailProvider();
