import { z } from "zod";

const authEmailSchema = z.object({
  to: z.email(),
  subject: z.string().min(1).max(140),
  text: z.string().min(1).max(20_000),
  category: z.enum(["verification", "password-reset", "invitation"]),
});

export type AuthEmail = z.infer<typeof authEmailSchema>;

function getCanonicalOrigin(): string {
  const candidate =
    process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;

  if (!candidate) {
    throw new Error("Brak BETTER_AUTH_URL.");
  }

  return new URL(candidate).origin;
}

export function requireCanonicalAuthUrl(value: string): string {
  const url = new URL(value);
  if (url.origin !== getCanonicalOrigin()) {
    throw new Error("Odrzucono nieznany adres wiadomości systemowej.");
  }

  return url.toString();
}

export async function sendAuthEmail(
  message: AuthEmail,
): Promise<"sent" | "skipped"> {
  const parsed = authEmailSchema.parse(message);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.info(
      JSON.stringify({
        event: "auth.email.skipped",
        category: parsed.category,
        reason: "provider-not-configured",
      }),
    );
    return "skipped";
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [parsed.to],
      subject: parsed.subject,
      text: parsed.text,
    }),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Wysyłka e-mail nie powiodła się (${response.status}).`);
  }

  return "sent";
}
