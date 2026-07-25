"use client";

import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  acceptInvitationAction,
} from "@/modules/identity/invitations/actions";
import type { IdentityRole } from "@/modules/identity/auth/access";
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

const rolePortal = {
  DIRECTOR: "szkola",
  TEACHER: "szkola",
  PARENT: "rodzic",
  STUDENT: "uczen",
} as const;

export function AcceptInvitationForm({
  token,
  name,
  maskedEmail,
  role,
  roleLabel,
}: {
  token: string;
  name: string;
  maskedEmail: string;
  role: IdentityRole;
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
          href={`/panel/logowanie?rola=${rolePortal[role]}`}
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
      <h1>Ustaw dostęp do konta</h1>
      <p className="auth-card-lead">
        Rola: <strong>{roleLabel}</strong> · {maskedEmail}
      </p>

      <form className="auth-form" action={formAction}>
        <input type="hidden" name="token" value={token} />
        <label>
          <span>Imię i nazwisko</span>
          <input
            type="text"
            name="name"
            defaultValue={name}
            autoComplete="name"
            minLength={2}
            maxLength={80}
            required
          />
        </label>
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

        {state.status === "error" ? (
          <div className="auth-message auth-message-error" role="alert">
            {state.message}
          </div>
        ) : null}

        <AcceptButton />
      </form>

      <div className="invitation-privacy-note">
        <ShieldCheck aria-hidden="true" />
        Link przestanie działać po utworzeniu konta.
      </div>
    </section>
  );
}
