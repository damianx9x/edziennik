"use client";

import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { createFirstOwner, resendFirstOwnerActivation } from "./actions";
import { initialFirstRunState } from "./schema";

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <small className="field-error">{errors[0]}</small> : null;
}

export function FirstRunForm({
  emailReady,
  pendingActivationEmail,
}: {
  emailReady: boolean;
  pendingActivationEmail?: string;
}) {
  const [state, action, pending] = useActionState(
    createFirstOwner,
    initialFirstRunState,
  );
  const [showPassword, setShowPassword] = useState(false);

  if (state.email && state.status === "error") {
    return (
      <PendingActivation
        email={state.email}
        emailReady={emailReady}
        initialMessage={state.message}
      />
    );
  }

  if (pendingActivationEmail) {
    return (
      <PendingActivation
        email={pendingActivationEmail}
        emailReady={emailReady}
      />
    );
  }

  if (state.status === "success") {
    const usesEmailActivation = state.activationMode === "email";
    return (
      <section className="security-setup-card first-run-success" aria-live="polite">
        <div className="auth-card-icon auth-card-icon-success">
          <MailCheck aria-hidden="true" />
        </div>
        <span className="auth-card-overline">Krok 1 zakończony</span>
        <h2>{usesEmailActivation ? "Sprawdź pocztę" : "Konto jest gotowe"}</h2>
        <p>{state.message}</p>
        {usesEmailActivation ? (
          <div className="auth-message auth-message-success">
            <CheckCircle2 aria-hidden="true" />
            Wiadomość wysłaliśmy na: <strong>{state.email}</strong>
          </div>
        ) : (
          <div className="auth-message auth-message-success">
            <CheckCircle2 aria-hidden="true" />
            Konto zabezpieczono jednorazowym kodem instalacyjnym.
          </div>
        )}
        <ol className="first-run-next-steps">
          {usesEmailActivation ? <li>Kliknij „Potwierdź adres” w wiadomości.</li> : null}
          <li>Zaloguj się swoim e-mailem i hasłem.</li>
          <li>Zeskanuj kod MFA telefonem i zapisz kody awaryjne.</li>
          <li>{usesEmailActivation ? "W centrum systemu wybierz „Zaproś pierwszą osobę”." : "Podłącz e-mail przed wysłaniem pierwszego zaproszenia."}</li>
        </ol>
        <Link className="button button-primary button-full" href="/panel/logowanie">
          Przejdź do logowania <ArrowRight aria-hidden="true" />
        </Link>
      </section>
    );
  }

  return (
    <section className="security-setup-card" aria-labelledby="first-run-title">
      <div className="auth-card-icon auth-card-icon-secure">
        <KeyRound aria-hidden="true" />
      </div>
      <span className="auth-card-overline">Jednorazowa konfiguracja</span>
      <h2 id="first-run-title">Utwórz konto właściciela</h2>
      <p>
        To będzie jedyne konto tworzone bez zaproszenia. Pozostałe osoby dodasz
        później z bezpiecznego panelu.
      </p>

      {!emailReady ? (
        <div className="auth-message auth-message-info" role="status">
          Poczta nie jest jeszcze ustawiona. Możesz utworzyć konto teraz kodem
          instalacyjnym, a SMTP lub Resend podłączyć później z panelu serwera.
        </div>
      ) : null}

      <form className="auth-form" action={action} aria-busy={pending}>
        <label>
          <span>Jednorazowy kod instalacyjny</span>
          <input
            name="setupCode"
            type="password"
            autoComplete="off"
            placeholder="Kod zapisany podczas instalacji"
            required
            disabled={pending}
          />
          <small>To nie jest hasło do konta. Kod zadziała tylko przy pierwszym uruchomieniu.</small>
          <FieldError errors={state.fieldErrors?.setupCode} />
        </label>
        <label>
          <span>Nazwa szkoły</span>
          <input
            name="schoolName"
            defaultValue="King’s Language Academy"
            autoComplete="organization"
            required
            disabled={pending}
          />
          <FieldError errors={state.fieldErrors?.schoolName} />
        </label>
        <label>
          <span>Twoje imię i nazwisko</span>
          <input
            name="ownerName"
            autoComplete="name"
            placeholder="np. Damian Kowalski"
            required
            disabled={pending}
          />
          <FieldError errors={state.fieldErrors?.ownerName} />
        </label>
        <label>
          <span>Twój adres e-mail</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="adres, który możesz teraz otworzyć"
            required
            disabled={pending}
          />
          <small>Na ten adres przyjdzie jednorazowy link aktywacyjny.</small>
          <FieldError errors={state.fieldErrors?.email} />
        </label>
        <label>
          <span>Nowe hasło</span>
          <span className="password-field">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={12}
              required
              disabled={pending}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </span>
          <small>Minimum 12 znaków. Użyj unikalnego hasła.</small>
          <FieldError errors={state.fieldErrors?.password} />
        </label>
        <label>
          <span>Powtórz hasło</span>
          <input
            name="passwordConfirmation"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={12}
            required
            disabled={pending}
          />
          <FieldError errors={state.fieldErrors?.passwordConfirmation} />
        </label>
        <label className="auth-check auth-check-card">
          <input
            name="acceptedSecurityNotice"
            type="checkbox"
            required
            disabled={pending}
          />
          <span>
            Zapiszę kody awaryjne poza Raspberry Pi
            <small>System pokaże je po konfiguracji aplikacji MFA.</small>
          </span>
        </label>
        <FieldError errors={state.fieldErrors?.acceptedSecurityNotice} />

        {state.message ? (
          <div className="auth-message auth-message-error" role="alert">
            {state.message}
          </div>
        ) : null}

        <button
          className="button button-primary button-full"
          type="submit"
          disabled={pending}
        >
          {pending ? (
            <><LoaderCircle className="spin" aria-hidden="true" /> Tworzę bezpieczne konto…</>
          ) : (
            <>{emailReady ? "Wyślij e-mail aktywacyjny" : "Utwórz konto bez poczty"} <ArrowRight aria-hidden="true" /></>
          )}
        </button>
      </form>
      <p className="auth-help">
        <ShieldCheck aria-hidden="true" /> Dane pozostają w zaszyfrowanej instalacji szkoły.
      </p>
    </section>
  );
}

function PendingActivation({
  email,
  emailReady,
  initialMessage,
}: {
  email: string;
  emailReady: boolean;
  initialMessage?: string;
}) {
  const [state, action, pending] = useActionState(
    resendFirstOwnerActivation,
    initialFirstRunState,
  );
  return (
    <section className="security-setup-card first-run-success">
      <div className="auth-card-icon"><MailCheck aria-hidden="true" /></div>
      <span className="auth-card-overline">Konto oczekuje</span>
      <h2>Potwierdź adres e-mail</h2>
      <p>
        Konto dla <strong>{email}</strong> już istnieje, ale nie zostało jeszcze
        aktywowane. Otwórz ostatnią wiadomość albo wyślij nową.
      </p>
      {initialMessage ? (
        <div className="auth-message auth-message-error" role="alert">
          {initialMessage}
        </div>
      ) : null}
      <form className="auth-form" action={action}>
        <label>
          <span>Jednorazowy kod instalacyjny</span>
          <input name="setupCode" type="password" autoComplete="off" required />
        </label>
        {state.message ? (
          <div
            className={`auth-message auth-message-${state.status === "success" ? "success" : "error"}`}
            role="status"
          >
            {state.message}
          </div>
        ) : null}
        <button
          className="button button-primary button-full"
          type="submit"
          disabled={pending || !emailReady}
        >
          {pending ? <><LoaderCircle className="spin" aria-hidden="true" /> Wysyłam…</> : "Wyślij nową wiadomość"}
        </button>
      </form>
      <Link className="auth-text-button" href="/panel/logowanie">
        Mam już potwierdzenie — przejdź do logowania
      </Link>
    </section>
  );
}
