"use client";

import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  acceptInvitationAction,
} from "@/modules/identity/invitations/actions";
import { initialInvitationActionState } from "@/modules/identity/invitations/state";

function AcceptButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="button button-primary button-full"
      type="submit"
      disabled={pending}
    >
      {pending ? (
        <>
          <LoaderCircle className="spin" aria-hidden="true" />
          Tworzę konto…
        </>
      ) : (
        <>
          Utwórz moje konto <ArrowRight aria-hidden="true" />
        </>
      )}
    </button>
  );
}

export function AcceptInvitationForm({
  token,
  firstName,
  lastName,
  email,
  maskedEmail,
  kind,
  roleLabel,
}: {
  token: string;
  firstName: string;
  lastName: string;
  email: string;
  maskedEmail: string;
  kind: "EMAIL" | "ROLE_QR";
  roleLabel: string;
}) {
  const [state, formAction] = useActionState(
    acceptInvitationAction,
    initialInvitationActionState,
  );
  const [showPassword, setShowPassword] = useState(false);

  if (state.status === "success") {
    return (
      <section className="auth-card invitation-accept-card">
        <div className="auth-card-icon auth-card-icon-success">
          <CheckCircle2 aria-hidden="true" />
        </div>
        <span className="auth-card-overline">Konto gotowe</span>
        <h1>Witaj w eDzienniku King’s!</h1>
        <p className="auth-card-lead">{state.message}</p>
        <Link
          className="button button-primary button-full"
          href="/panel/logowanie"
        >
          Zaloguj się <ArrowRight aria-hidden="true" />
        </Link>
      </section>
    );
  }

  return (
    <section className="auth-card invitation-accept-card">
      <div className="auth-card-icon">
        <KeyRound aria-hidden="true" />
      </div>
      <span className="auth-card-overline">Zaproszenie KLA</span>
      <h1>Utwórz swoje konto</h1>
      <p className="auth-card-lead">
        Konto otrzyma rolę: <strong>{roleLabel}</strong>
        {kind === "EMAIL" ? ` · ${maskedEmail}` : ""}
      </p>

      <form className="auth-form" action={formAction}>
        <input type="hidden" name="token" value={token} />
        <div className="invitation-form-section">
          <div className="invitation-form-section-heading">
            <UserRound aria-hidden="true" />
            <span>
              <strong>Twoje dane</strong>
              <small>Wpisz dane osoby, która będzie używać konta.</small>
            </span>
          </div>
          <div className="invite-form-grid">
            <label>
              <span>Imię</span>
              <input
                type="text"
                name="firstName"
                defaultValue={firstName}
                autoComplete="given-name"
                minLength={2}
                maxLength={80}
                required
                placeholder="np. Anna"
              />
            </label>
            <label>
              <span>Nazwisko</span>
              <input
                type="text"
                name="lastName"
                defaultValue={lastName}
                autoComplete="family-name"
                minLength={2}
                maxLength={80}
                required
                placeholder="np. Kowalska"
              />
            </label>
          </div>
          <label>
            <span>Adres e-mail</span>
            <input
              type="email"
              name="email"
              defaultValue={email}
              readOnly={kind === "EMAIL"}
              autoComplete="email"
              inputMode="email"
              required
              placeholder="adres@domena.pl"
            />
            <small>
              {kind === "EMAIL"
                ? "Ten adres został przypisany przez szkołę."
                : "Na ten adres będziesz się później logować."}
            </small>
          </label>
          <label>
            <span>Telefon <small>(opcjonalnie)</small></span>
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              inputMode="tel"
              maxLength={30}
              placeholder="np. +48 500 000 000"
            />
            <small>Przyda się szkole do pilnego kontaktu.</small>
          </label>
        </div>
        <div className="invitation-form-section">
          <div className="invitation-form-section-heading">
            <KeyRound aria-hidden="true" />
            <span>
              <strong>Bezpieczne hasło</strong>
              <small>Może to być łatwe do zapamiętania krótkie zdanie.</small>
            </span>
          </div>
        <label>
          <span>Hasło</span>
          <span className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              aria-describedby="invite-password-hint"
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
          <small id="invite-password-hint">
            Minimum 12 znaków. Użyj unikalnego hasła lub krótkiego zdania.
          </small>
        </label>
        <label>
          <span>Powtórz hasło</span>
          <input
            type={showPassword ? "text" : "password"}
            name="passwordConfirmation"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        </div>

        {state.status === "error" ? (
          <div className="auth-message auth-message-error" role="alert">
            {state.message}
          </div>
        ) : null}

        <AcceptButton />
      </form>

      <div className="invitation-privacy-note">
        <ShieldCheck aria-hidden="true" />
        Link przestanie działać po utworzeniu konta. Roli nie można tu zmienić.
      </div>
    </section>
  );
}
