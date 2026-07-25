"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { Brand } from "@/app/components/brand";
import { authClient } from "@/lib/auth-client";

export function PasswordRecoveryForm() {
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsPending(true);

    try {
      const result = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: "/panel/nowe-haslo",
      });

      if (result.error?.status === 429) {
        setMessage("Za dużo prób. Odczekaj chwilę i spróbuj ponownie.");
        return;
      }

      setIsSent(true);
    } catch {
      setMessage(
        "Nie udało się połączyć z eDziennikiem. Spróbuj ponownie za chwilę.",
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
        <div className="auth-card-icon">
          {isSent ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <KeyRound aria-hidden="true" />
          )}
        </div>
        <span className="auth-card-overline">Odzyskiwanie dostępu</span>
        <h1>{isSent ? "Sprawdź pocztę" : "Ustaw nowe hasło"}</h1>

        {isSent ? (
          <>
            <p className="auth-card-lead">
              Jeśli ten adres ma konto, wysłaliśmy bezpieczny link. Sprawdź też
              folder Spam i Oferty.
            </p>
            <div className="auth-message auth-message-success" role="status">
              <Mail aria-hidden="true" />
              Ze względów bezpieczeństwa zawsze pokazujemy ten sam komunikat.
            </div>
            <Link
              className="button button-primary button-full"
              href="/panel/logowanie"
            >
              Wróć do logowania <ArrowRight aria-hidden="true" />
            </Link>
          </>
        ) : (
          <>
            <p className="auth-card-lead">
              Podaj adres użyty w zaproszeniu. Wyślemy link ważny przez godzinę.
            </p>
            <form
              className="auth-form"
              onSubmit={submit}
              aria-busy={isPending}
            >
              <label>
                <span>Adres e-mail</span>
                <input
                  type="email"
                  name="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={isPending}
                  placeholder="adres@domena.pl"
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
                    Wysyłam…
                  </>
                ) : (
                  <>
                    Wyślij link <ArrowRight aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
