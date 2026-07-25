"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Brand } from "@/app/components/brand";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!token) {
      setMessage("Brakuje bezpiecznego tokenu. Otwórz pełny link z e-maila.");
      return;
    }
    if (password.length < 12) {
      setMessage("Hasło musi mieć co najmniej 12 znaków.");
      return;
    }
    if (password !== confirmation) {
      setMessage("Hasła nie są takie same.");
      return;
    }

    setIsPending(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (result.error) {
        setMessage(
          "Link wygasł albo został już użyty. Poproś o nowy link do hasła.",
        );
        return;
      }
      setIsDone(true);
    } catch {
      setMessage("Nie udało się ustawić hasła. Spróbuj ponownie.");
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
        <div className="auth-card-icon">
          {isDone ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <KeyRound aria-hidden="true" />
          )}
        </div>
        <span className="auth-card-overline">Bezpieczne konto</span>
        <h1>{isDone ? "Hasło zmienione" : "Wybierz nowe hasło"}</h1>

        {isDone ? (
          <>
            <p className="auth-card-lead">
              Wszystkie starsze sesje zostały unieważnione. Zaloguj się nowym
              hasłem.
            </p>
            <Link
              className="button button-primary button-full"
              href="/panel/logowanie"
            >
              Przejdź do logowania <ArrowRight aria-hidden="true" />
            </Link>
          </>
        ) : (
          <form
            className="auth-form"
            onSubmit={submit}
            aria-busy={isPending}
          >
            <label>
              <span>Nowe hasło</span>
              <span className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={isPending}
                  aria-describedby="password-hint"
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
              <small id="password-hint">
                Minimum 12 znaków. Najłatwiej zapamiętać krótkie zdanie.
              </small>
            </label>
            <label>
              <span>Powtórz hasło</span>
              <input
                type={showPassword ? "text" : "password"}
                name="passwordConfirmation"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
                disabled={isPending}
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
                  Zapisuję…
                </>
              ) : (
                "Ustaw nowe hasło"
              )}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
