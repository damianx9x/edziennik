export type DiagnosticStatus = "ok" | "warning" | "error";

export type DiagnosticCheck = {
  key: string;
  label: string;
  detail: string;
  status: DiagnosticStatus;
};

type DiagnosticEnvironment = Record<string, string | undefined>;

export function buildConfigurationChecks(
  environment: DiagnosticEnvironment,
): DiagnosticCheck[] {
  const appUrl =
    environment.BETTER_AUTH_URL ?? environment.NEXT_PUBLIC_APP_URL ?? "";
  const isLocalUrl =
    appUrl.startsWith("http://localhost") ||
    appUrl.startsWith("http://127.0.0.1");
  const emailReady = Boolean(
    environment.RESEND_API_KEY && environment.EMAIL_FROM,
  );
  const storageProvider = environment.FILE_STORAGE_PROVIDER ?? "local";
  const storageReady =
    storageProvider === "local" ||
    (storageProvider === "s3" && Boolean(environment.S3_BUCKET));
  const smsProvider = environment.SMS_PROVIDER ?? "disabled";
  const directorMfaRequired =
    environment.KLA_REQUIRE_DIRECTOR_MFA !== "0";

  return [
    {
      key: "auth-secret",
      label: "Sekret logowania",
      detail:
        (environment.BETTER_AUTH_SECRET?.length ?? 0) >= 32
          ? "Skonfigurowany i ma bezpieczną długość."
          : "Brak lub mniej niż 32 znaki.",
      status:
        (environment.BETTER_AUTH_SECRET?.length ?? 0) >= 32
          ? "ok"
          : "error",
    },
    {
      key: "app-url",
      label: "Adres aplikacji",
      detail: !appUrl
        ? "Brak BETTER_AUTH_URL."
        : appUrl.startsWith("https://") || isLocalUrl
          ? "Adres ma prawidłowy protokół."
          : "Produkcja powinna używać HTTPS.",
      status: !appUrl
        ? "error"
        : appUrl.startsWith("https://") || isLocalUrl
          ? "ok"
          : "warning",
    },
    {
      key: "email",
      label: "Wysyłka e-mail",
      detail: emailReady
        ? "Dostawca i adres nadawcy są skonfigurowane."
        : "Tryb demonstracyjny — link trzeba kopiować ręcznie.",
      status: emailReady ? "ok" : "warning",
    },
    {
      key: "storage",
      label: "Prywatne pliki",
      detail: storageReady
        ? `Aktywny magazyn: ${storageProvider}.`
        : "Wybrano S3, ale brakuje nazwy zasobnika.",
      status: storageReady ? "ok" : "error",
    },
    {
      key: "monitoring",
      label: "Monitoring błędów",
      detail: environment.SENTRY_DSN
        ? "Zewnętrzny monitoring jest podłączony."
        : "Sentry nie jest jeszcze podłączone.",
      status: environment.SENTRY_DSN ? "ok" : "warning",
    },
    {
      key: "sms",
      label: "Powiadomienia SMS",
      detail:
        smsProvider !== "disabled" && environment.SMS_API_KEY
          ? `Dostawca ${smsProvider} jest skonfigurowany.`
          : "SMS są wyłączone.",
      status:
        smsProvider !== "disabled" && environment.SMS_API_KEY
          ? "ok"
          : "warning",
    },
    {
      key: "director-mfa",
      label: "MFA dyrektora",
      detail: directorMfaRequired
        ? "Obowiązkowe przy otwieraniu panelu dyrektora."
        : "Wyłączone na czas pilota — włącz przed prawdziwymi danymi.",
      status: directorMfaRequired ? "ok" : "warning",
    },
    {
      key: "release",
      label: "Identyfikator wydania",
      detail: environment.NEXT_PUBLIC_APP_RELEASE
        ? "Każde zgłoszenie można powiązać z wersją."
        : "Brak NEXT_PUBLIC_APP_RELEASE.",
      status: environment.NEXT_PUBLIC_APP_RELEASE ? "ok" : "warning",
    },
  ];
}

const sensitiveKeyPattern =
  /(password|secret|token|email|phone|ip|message|content|description|authorization|cookie)/i;

export function sanitizeDiagnosticValue(
  value: unknown,
  key = "",
): unknown {
  if (sensitiveKeyPattern.test(key)) return "[UKRYTO]";
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDiagnosticValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => [
        nestedKey,
        sanitizeDiagnosticValue(nestedValue, nestedKey),
      ]),
    );
  }
  if (typeof value === "string" && value.length > 500) {
    return `${value.slice(0, 500)}…`;
  }
  return value;
}
