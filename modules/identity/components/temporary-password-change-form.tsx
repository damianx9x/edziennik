"use client";

import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import {
  completeTemporaryPasswordChangeAction,
  type TemporaryPasswordChangeState,
} from "@/modules/identity/temporary-password-actions";

const initialState: TemporaryPasswordChangeState = { status: "idle" };

export function TemporaryPasswordChangeForm({ expired }: { expired: boolean }) {
  const [state, action, pending] = useActionState(
    completeTemporaryPasswordChangeAction,
    initialState,
  );
  const [show, setShow] = useState(false);

  if (expired) {
    return (
      <div className="auth-message auth-message-error" role="alert">
        Hasło tymczasowe wygasło. Poproś dyrektora o wygenerowanie nowego.
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div className="temporary-password-done">
        <div className="auth-message auth-message-success" role="status">
          <CheckCircle2 aria-hidden="true" /> {state.message}
        </div>
        <Link className="button button-primary button-full" href="/panel">
          Otwórz mój panel <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-form" action={action} aria-busy={pending}>
      <label>
        <span>Hasło tymczasowe</span>
        <span className="password-field">
          <input
            type={show ? "text" : "password"}
            name="currentPassword"
            autoComplete="current-password"
            minLength={12}
            maxLength={128}
            required
            disabled={pending}
          />
          <button
            type="button"
            onClick={() => setShow((current) => !current)}
            aria-label={show ? "Ukryj hasła" : "Pokaż hasła"}
          >
            {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </span>
      </label>
      <label>
        <span>Twoje nowe hasło</span>
        <input
          type={show ? "text" : "password"}
          name="newPassword"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          disabled={pending}
        />
        <small>Minimum 12 znaków. Użyj unikalnego hasła, którego nie stosujesz gdzie indziej.</small>
      </label>
      <label>
        <span>Powtórz nowe hasło</span>
        <input
          type={show ? "text" : "password"}
          name="confirmation"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          disabled={pending}
        />
      </label>
      {state.message ? (
        <div className="auth-message auth-message-error" role="alert">
          {state.message}
        </div>
      ) : null}
      <button className="button button-primary button-full" type="submit" disabled={pending}>
        {pending ? (
          <><LoaderCircle className="spin" aria-hidden="true" /> Zmieniam…</>
        ) : (
          <><KeyRound aria-hidden="true" /> Ustaw własne hasło</>
        )}
      </button>
    </form>
  );
}
