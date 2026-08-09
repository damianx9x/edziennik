"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { acceptContractAction } from "../actions";

export function ContractAcceptForm({
  assignmentId,
  statement,
  actionLabel,
}: {
  assignmentId: string;
  statement: string;
  actionLabel: string;
}) {
  const [state, action, pending] = useActionState(acceptContractAction, {
    status: "idle" as const,
  });

  return (
    <form action={action} className="contract-accept-form">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <label className="stage4-check">
        <input type="checkbox" name="confirmation" value="accepted" required />
        <span>{statement}</span>
      </label>
      {state.message ? (
        <p className={`stage4-feedback ${state.status}`} role="status">{state.message}</p>
      ) : null}
      <button className="stage4-primary" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
        {pending ? "Zapisuję akceptację…" : actionLabel}
      </button>
    </form>
  );
}
