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

import {
  configureFirstRunSmtp,
  createFirstOwner,
  resendFirstOwnerActivation,
  type FirstRunSmtpState,
} from "./actions";
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
  const [recoverySaved, setRecoverySaved] = useState(false);

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
        {state.recoveryKey ? (
          <div className="auth-message auth-message-info recovery-key-once">
            <KeyRound aria-hidden="true" />
            <div>
              <strong>Jedyny klucz pełnego odtworzenia</strong>
              <p>Skopiuj go teraz do menedżera haseł i na zaszyfrowany nośnik poza Raspberry Pi. Po opuszczeniu ekranu serwer nie pokaże go ponownie. Bez niego eksportów nie da się odszyfrować.</p>
              <code>{state.recoveryKey}</code>
              <button className="button button-secondary" type="button" onClick={() => void navigator.clipboard.writeText(state.recoveryKey!)}>Kopiuj klucz</button>
              <label className="auth-check auth-check-card"><input type="checkbox" checked={recoverySaved} onChange={(event) => setRecoverySaved(event.target.checked)} /><span>Zapisałem klucz w dwóch bezpiecznych miejscach</span></label>
            </div>
          </div>
        ) : state.recoveryKeyWarning ? <div className="auth-message auth-message-error" role="alert">{state.recoveryKeyWarning}</div> : null}
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
        <Link className={`button button-primary button-full${state.recoveryKey && !recoverySaved ? " disabled" : ""}`} aria-disabled={Boolean(state.recoveryKey && !recoverySaved)} tabIndex={state.recoveryKey && !recoverySaved ? -1 : undefined} href={state.recoveryKey && !recoverySaved ? "#zapisz-klucz" : "/panel/logowanie"}>
          Przejdź do logowania <ArrowRight aria-hidden="true" />
        </Link>
      </section>
    );
  }

  return (
    <div className="first-run-form-stack">
      {!emailReady ? <FirstRunEmailSetup /> : null}
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
          Poczta nie jest jeszcze ustawiona. Najpierw użyj konfiguracji SMTP
          powyżej, jeśli konto ma otrzymać e-mail aktywacyjny. Możesz też
          świadomie utworzyć konto kodem instalacyjnym i podłączyć pocztę później.
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
          <small>
            {emailReady
              ? "Na ten adres przyjdzie jednorazowy link aktywacyjny."
              : "Bez SMTP konto zostanie potwierdzone bezpiecznym kodem instalacyjnym."}
          </small>
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
    </div>
  );
}

const initialSmtpState: FirstRunSmtpState = { status: "idle" };

function FirstRunEmailSetup() {
  const [state, action, pending] = useActionState(
    configureFirstRunSmtp,
    initialSmtpState,
  );
  return (
    <details className="security-setup-card first-run-smtp-card" open>
      <summary>
        <MailCheck aria-hidden="true" />
        <span><strong>Najpierw ustaw wysyłkę e-mail</strong><small>Kreator sprawdzi SMTP i wyśle prawdziwą wiadomość testową.</small></span>
      </summary>
      <form className="auth-form" action={action} aria-busy={pending}>
        <label><span>Kod instalacyjny</span><input name="setupCode" type="password" autoComplete="off" required disabled={pending} /></label>
        <label><span>E-mail do testu</span><input name="testEmail" type="email" autoComplete="email" required disabled={pending} /></label>
        <label><span>Adres nadawcy</span><input name="from" type="email" placeholder="sekretariat@domena.pl" required disabled={pending} /></label>
        <div className="first-run-smtp-grid">
          <label><span>Serwer SMTP</span><input name="host" placeholder="smtp.domena.pl" required disabled={pending} /></label>
          <label><span>Port</span><select name="port" defaultValue="465" disabled={pending}><option value="465">465 — SSL/TLS</option><option value="587">587 — STARTTLS</option></select></label>
        </div>
        <label><span>Login SMTP</span><input name="user" autoComplete="username" required disabled={pending} /></label>
        <label><span>Hasło SMTP lub hasło aplikacji</span><input name="password" type="password" autoComplete="new-password" required disabled={pending} /></label>
        {state.message ? <div className={`auth-message auth-message-${state.status === "success" ? "success" : "error"}`} role="status">{state.message}</div> : null}
        <button className="button button-secondary button-full" type="submit" disabled={pending}>
          {pending ? <><LoaderCircle className="spin" aria-hidden="true" /> Sprawdzam i wysyłam test…</> : <><MailCheck aria-hidden="true" /> Sprawdź SMTP i zapisz</>}
        </button>
      </form>
    </details>
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
