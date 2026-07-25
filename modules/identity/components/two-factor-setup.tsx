"use client";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clipboard,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";

type SetupData = {
  totpURI: string;
  backupCodes: string[];
};

export function TwoFactorSetup({ firstName }: { firstName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "verify" | "backup">(
    "password",
  );
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [qrCode, setQrCode] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [codesSaved, setCodesSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const manualSecret = useMemo(() => {
    if (!setupData) return "";
    try {
      return new URL(setupData.totpURI).searchParams.get("secret") ?? "";
    } catch {
      return "";
    }
  }, [setupData]);

  useEffect(() => {
    if (!setupData?.totpURI) return;

    let cancelled = false;
    void QRCode.toDataURL(setupData.totpURI, {
      width: 260,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#101c3d",
        light: "#ffffff",
      },
    }).then((image) => {
      if (!cancelled) setQrCode(image);
    });

    return () => {
      cancelled = true;
    };
  }, [setupData]);

  async function startSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsPending(true);

    try {
      const result = await authClient.twoFactor.enable({
        password,
        issuer: "King’s Language Academy",
      });

      if (result.error || !result.data) {
        setMessage(
          "Hasło jest nieprawidłowe. Sprawdź je i spróbuj ponownie.",
        );
        return;
      }

      setSetupData({
        totpURI: result.data.totpURI,
        backupCodes: result.data.backupCodes,
      });
      setPassword("");
      setStep("verify");
    } catch {
      setMessage("Nie udało się rozpocząć konfiguracji. Spróbuj ponownie.");
    } finally {
      setIsPending(false);
    }
  }

  async function verifySetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsPending(true);

    try {
      const result = await authClient.twoFactor.verifyTotp({
        code: code.replace(/\s/g, ""),
        trustDevice: true,
      });

      if (result.error) {
        setMessage(
          result.error.status === 429
            ? "Za dużo błędnych prób. Odczekaj 15 minut."
            : "Kod jest nieprawidłowy. Poczekaj na nowy kod i wpisz go ponownie.",
        );
        return;
      }

      setStep("backup");
    } catch {
      setMessage("Nie udało się sprawdzić kodu. Spróbuj ponownie.");
    } finally {
      setIsPending(false);
    }
  }

  async function copyBackupCodes() {
    if (!setupData) return;
    try {
      await navigator.clipboard.writeText(setupData.backupCodes.join("\n"));
      setCopied(true);
    } catch {
      setMessage("Nie udało się skopiować. Zapisz kody ręcznie.");
    }
  }

  function finish() {
    if (!codesSaved) {
      setMessage("Potwierdź, że kody awaryjne są zapisane.");
      return;
    }
    router.replace("/panel/szkola");
    router.refresh();
  }

  return (
    <main className="security-setup-page">
      <section className="security-setup-intro">
        <span className="auth-kicker">Ochrona konta dyrektora</span>
        <h1>Jeszcze jeden krok, {firstName}.</h1>
        <p>
          Konto dyrektora widzi najwięcej danych, dlatego wymaga kodu z
          telefonu przy logowaniu.
        </p>
        <ol className="security-steps" aria-label="Postęp konfiguracji">
          <li className={step === "password" ? "active" : "done"}>
            <span>{step === "password" ? "1" : <Check aria-hidden="true" />}</span>
            Potwierdź hasło
          </li>
          <li
            className={
              step === "verify" ? "active" : step === "backup" ? "done" : ""
            }
          >
            <span>{step === "backup" ? <Check aria-hidden="true" /> : "2"}</span>
            Połącz telefon
          </li>
          <li className={step === "backup" ? "active" : ""}>
            <span>3</span>
            Zapisz kody
          </li>
        </ol>
      </section>

      <section className="security-setup-card">
        {step === "password" ? (
          <>
            <div className="auth-card-icon auth-card-icon-secure">
              <ShieldCheck aria-hidden="true" />
            </div>
            <h2>Potwierdź swoje hasło</h2>
            <p>
              To zabezpiecza konfigurację przed osobą, która tylko na chwilę
              dostała dostęp do komputera.
            </p>
            <form className="auth-form" onSubmit={startSetup}>
              <label>
                <span>Aktualne hasło</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={isPending}
                  autoFocus
                />
              </label>
              {message ? (
                <div className="auth-message auth-message-error" role="alert">
                  {message}
                </div>
              ) : null}
              <button
                className="button button-primary button-full"
                type="submit"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <LoaderCircle className="spin" aria-hidden="true" />
                    Sprawdzam…
                  </>
                ) : (
                  <>
                    Dalej <ArrowRight aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          </>
        ) : null}

        {step === "verify" && setupData ? (
          <>
            <div className="auth-card-icon">
              <Smartphone aria-hidden="true" />
            </div>
            <h2>Zeskanuj kod telefonem</h2>
            <p>
              Otwórz Google Authenticator, Microsoft Authenticator albo aplikację
              Hasła na iPhonie i dodaj nowe konto.
            </p>
            <div className="totp-setup-grid">
              <div className="totp-qr">
                {qrCode ? (
                  <Image
                    src={qrCode}
                    width={260}
                    height={260}
                    alt="Kod QR do połączenia aplikacji uwierzytelniającej"
                    unoptimized
                  />
                ) : (
                  <LoaderCircle className="spin" aria-label="Tworzę kod QR" />
                )}
              </div>
              <div className="totp-instructions">
                <strong>Nie możesz zeskanować?</strong>
                <span>Wpisz ten klucz ręcznie:</span>
                <code>{manualSecret}</code>
                <small>Nie wysyłaj tego klucza innej osobie.</small>
              </div>
            </div>
            <form className="auth-form" onSubmit={verifySetup}>
              <label>
                <span>6-cyfrowy kod z aplikacji</span>
                <input
                  className="totp-input"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  minLength={6}
                  maxLength={8}
                  required
                  disabled={isPending}
                  placeholder="000 000"
                  autoFocus
                />
              </label>
              {message ? (
                <div className="auth-message auth-message-error" role="alert">
                  {message}
                </div>
              ) : null}
              <button
                className="button button-primary button-full"
                type="submit"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <LoaderCircle className="spin" aria-hidden="true" />
                    Sprawdzam…
                  </>
                ) : (
                  "Połącz i sprawdź kod"
                )}
              </button>
            </form>
          </>
        ) : null}

        {step === "backup" && setupData ? (
          <>
            <div className="auth-card-icon auth-card-icon-success">
              <CheckCircle2 aria-hidden="true" />
            </div>
            <h2>Zapisz kody awaryjne</h2>
            <p>
              Każdy kod działa tylko raz. Przechowuj je poza telefonem — na
              przykład w menedżerze haseł albo w zamkniętej kopercie.
            </p>
            <div className="backup-code-grid" aria-label="Kody awaryjne">
              {setupData.backupCodes.map((backupCode) => (
                <code key={backupCode}>{backupCode}</code>
              ))}
            </div>
            <button
              className="button button-secondary button-full"
              type="button"
              onClick={copyBackupCodes}
            >
              {copied ? (
                <>
                  <Check aria-hidden="true" /> Skopiowano
                </>
              ) : (
                <>
                  <Clipboard aria-hidden="true" /> Skopiuj kody
                </>
              )}
            </button>
            <label className="auth-check auth-check-card">
              <input
                type="checkbox"
                checked={codesSaved}
                onChange={(event) => setCodesSaved(event.target.checked)}
              />
              <span>
                Zapisałam / zapisałem kody w bezpiecznym miejscu
              </span>
            </label>
            {message ? (
              <div className="auth-message auth-message-error" role="alert">
                {message}
              </div>
            ) : null}
            <button
              className="button button-primary button-full"
              type="button"
              onClick={finish}
            >
              Otwórz panel szkoły <ArrowRight aria-hidden="true" />
            </button>
            <div className="security-fine-print">
              <KeyRound aria-hidden="true" />
              KLA nie może odczytać Twoich kodów z aplikacji.
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
