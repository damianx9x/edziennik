"use client";

import { KeyRound, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { sendUserPasswordResetAction, type PasswordResetActionState } from "../password-reset-actions";

const initialState: PasswordResetActionState = { status: "idle" };

export function PasswordResetButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(sendUserPasswordResetAction, initialState);
  return <form action={action} className="person-password-reset">
    <input type="hidden" name="userId" value={userId} />
    <button className="person-module-action" type="submit" disabled={pending}>
      {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
      <span><strong>Reset hasła</strong><small>Wyślij bezpieczny link e-mailem</small></span>
    </button>
    {state.message ? <p className={`record-form-message is-${state.status}`} role="status">{state.message}</p> : null}
  </form>;
}
