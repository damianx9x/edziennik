export type EmailProviderKind = "resend" | "smtp";

export function resolveEmailProvider(
  environment: Record<string, string | undefined> = process.env,
): EmailProviderKind | null {
  const selected = environment.EMAIL_PROVIDER?.trim().toLowerCase();
  const smtpAuthComplete = Boolean(environment.SMTP_USER) === Boolean(environment.SMTP_PASSWORD);
  const smtpReady = Boolean(
    environment.SMTP_HOST &&
      environment.SMTP_PORT &&
      environment.EMAIL_FROM &&
      smtpAuthComplete,
  );
  const resendReady = Boolean(environment.RESEND_API_KEY && environment.EMAIL_FROM);

  if (selected === "smtp") return smtpReady ? "smtp" : null;
  if (selected === "resend") return resendReady ? "resend" : null;
  if (smtpReady) return "smtp";
  if (resendReady) return "resend";
  return null;
}
