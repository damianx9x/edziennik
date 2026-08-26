"use client";

import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { Brand } from "@/app/components/brand";
import { authClient } from "@/lib/auth-client";
import { isIdentityRole } from "@/modules/identity/auth/access";
import {
  getRoleHome,
  getSafeReturnPath,
} from "@/modules/identity/auth/redirects";
import { normalizeLoginIdentifier } from "@/modules/identity/auth/system-owner";

function getErrorMessage(code: string | undefined, status: number): string {
  if (status === 429) {
    return "Za dużo prób. Odczekaj chwilę i spróbuj ponownie.";
  }
  if (code === "EMAIL_NOT_VERIFIED") {
    return "Najpierw potwierdź adres e-mail z wiadomości od szkoły.";
  }
  if (code === "USER_BANNED") {
    return "To konto jest nieaktywne. Skontaktuj się ze szkołą.";
  }
  return "E-mail lub hasło są nieprawidłowe. Sprawdź dane i spróbuj ponownie.";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activationConfirmed = searchParams.get("aktywacja") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [message, setMessage] = useState(
    activationConfirmed
      ? "Adres e-mail został potwierdzony. Zaloguj się, aby skonfigurować MFA."
      : "",
  );
  const [messageTone, setMessageTone] = useState<"error" | "success">(
    activationConfirmed ? "success" : "error",
  );
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    void authClient.getSession().then((session) => {
      if (!isCurrent) return;
      const user = session.data?.user as
        | { role?: unknown; status?: unknown }
        | undefined;
      if (user?.status === "ACTIVE" && isIdentityRole(user.role)) {
        router.replace(getRoleHome(user.role));
        router.refresh();
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageTone("error");
    setIsPending(true);

    try {
      const result = await authClient.signIn.email({
        email: normalizeLoginIdentifier(email),
        password,
        rememberMe,
      });

      if (result.error) {
        setMessage(
          getErrorMessage(result.error.code, result.error.status ?? 400),
        );
        return;
      }

      if (
        result.data &&
        "twoFactorRedirect" in result.data &&
        result.data.twoFactorRedirect
      ) {
        return;
      }

      const session = await authClient.getSession();
      const role = (
        session.data?.user as { role?: unknown } | undefined
      )?.role;
      const fallback = isIdentityRole(role) ? getRoleHome(role) : "/panel";
      const destination = getSafeReturnPath(
        searchParams.get("powrot"),
        fallback,
      );

      router.replace(destination);
      router.refresh();
    } catch {
      setMessage(
        "Nie udało się połączyć z eDziennikiem. Sprawdź internet i spróbuj ponownie.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <Brand compact />
        <Link className="back-link" href="/">
          <ArrowLeft size={18} aria-hidden="true" /> Strona szkoły
        </Link>
      </div>

      <div className="auth-layout">
        <section className="auth-intro" aria-label="Bezpieczny dostęp">
          <span className="auth-kicker">eDziennik King’s</span>
          <h1>Witaj z powrotem.</h1>
          <p>
            Jedno spokojne miejsce na plan, wiadomości i codzienne sprawy KLA.
          </p>
          <ul>
            <li>
              <ShieldCheck aria-hidden="true" />
              Dostęp tylko przez zaproszenie szkoły
            </li>
            <li>
              <LockKeyhole aria-hidden="true" />
              Każda rola widzi wyłącznie swoje dane
            </li>
          </ul>
        </section>

        <section className="auth-card" aria-labelledby="login-title">
          <div className="auth-card-icon">
            <KeyRound aria-hidden="true" />
          </div>
          <span className="auth-card-overline">
            Bezpieczny dostęp
          </span>
          <h2 id="login-title">Zaloguj się</h2>
          <p className="auth-card-lead">
            Użyj adresu, na który przyszło zaproszenie, albo przydzielonego
            loginu technicznego. System sam rozpozna Twoją rolę.
          </p>

          <form
            className="auth-form"
            method="post"
            onSubmit={submit}
            aria-busy={isPending}
          >
            <label>
              <span>Adres e-mail lub login</span>
              <input
                name="identifier"
                type="text"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="np. rodzic@domena.pl"
                required
                disabled={isPending}
              />
            </label>

            <label>
              <span>Hasło</span>
              <span className="password-field">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Twoje hasło"
                  required
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>

            <div className="auth-form-row">
              <label className="auth-check">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  disabled={isPending}
                />
                <span>Zapamiętaj mnie</span>
              </label>
              <Link href="/panel/odzyskaj-dostep">
                Nie pamiętam hasła
              </Link>
            </div>

            {message ? (
              <div
                className={`auth-message auth-message-${messageTone}`}
                role="alert"
              >
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
                  Zaloguj się <ArrowRight aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="auth-help">
            Nie masz konta? Poproś dyrektora KLA o zaproszenie.
          </p>
        </section>
      </div>
    </main>
  );
}
