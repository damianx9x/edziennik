"use client";

import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Brand } from "@/app/components/brand";
import { authClient } from "@/lib/auth-client";
import { isIdentityRole } from "@/modules/identity/auth/access";
import { getRoleHome } from "@/modules/identity/auth/redirects";

export function TwoFactorChallenge() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsPending(true);

    try {
      const result = useBackupCode
        ? await authClient.twoFactor.verifyBackupCode({
            code: code.trim(),
            trustDevice,
          })
        : await authClient.twoFactor.verifyTotp({
            code: code.replace(/\s/g, ""),
            trustDevice,
          });

      if (result.error) {
        setMessage(
          result.error.status === 429
            ? "Konto jest chwilowo zablokowane po kilku błędnych próbach. Odczekaj 15 minut."
            : "Kod jest nieprawidłowy albo wygasł. Sprawdź go i spróbuj ponownie.",
        );
        return;
      }

      const session = await authClient.getSession();
      const role = (
        session.data?.user as { role?: unknown } | undefined
      )?.role;
      router.replace(isIdentityRole(role) ? getRoleHome(role) : "/panel");
      router.refresh();
    } catch {
      setMessage(
        "Nie udało się sprawdzić kodu. Sprawdź internet i spróbuj ponownie.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="auth-page auth-page-compact">
      <div className="auth-topbar">
        <Brand compact />
        <Link className="back-link" href="/panel/logowanie">
          <ArrowLeft aria-hidden="true" /> Logowanie
        </Link>
      </div>

      <section className="auth-card auth-card-standalone">
        <div className="auth-card-icon auth-card-icon-secure">
          <ShieldCheck aria-hidden="true" />
        </div>
        <span className="auth-card-overline">Drugi krok logowania</span>
        <h1>Potwierdź, że to Ty</h1>
        <p className="auth-card-lead">
          {useBackupCode
            ? "Wpisz jeden z zapisanych kodów awaryjnych. Po użyciu przestanie działać."
            : "Otwórz aplikację uwierzytelniającą i wpisz aktualny 6-cyfrowy kod."}
        </p>

        <form className="auth-form" onSubmit={submit} aria-busy={isPending}>
          <label>
            <span>{useBackupCode ? "Kod awaryjny" : "Kod z aplikacji"}</span>
            <input
              className={useBackupCode ? "" : "totp-input"}
              name="code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode={useBackupCode ? "text" : "numeric"}
              autoComplete="one-time-code"
              minLength={useBackupCode ? 6 : 6}
              maxLength={useBackupCode ? 32 : 8}
              placeholder={useBackupCode ? "XXXX-XXXX" : "000 000"}
              required
              autoFocus
              disabled={isPending}
            />
          </label>

          <label className="auth-check auth-check-card">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(event) => setTrustDevice(event.target.checked)}
              disabled={isPending}
            />
            <span>
              Zaufaj temu prywatnemu urządzeniu na 30 dni
              <small>Nie zaznaczaj na wspólnym komputerze.</small>
            </span>
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
                Potwierdź <ArrowRight aria-hidden="true" />
              </>
            )}
          </button>
          <button
            className="auth-text-button"
            type="button"
            onClick={() => {
              setUseBackupCode((current) => !current);
              setCode("");
              setMessage("");
            }}
          >
            <KeyRound aria-hidden="true" />
            {useBackupCode
              ? "Użyj kodu z aplikacji"
              : "Użyj kodu awaryjnego"}
          </button>
        </form>
      </section>
    </main>
  );
}
