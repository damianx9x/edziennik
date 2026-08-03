"use client";

import { Ban, LoaderCircle, X } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { revokeInvitationAction } from "@/modules/identity/invitations/actions";
import { initialInvitationActionState } from "@/modules/identity/invitations/state";

export function RevokeInvitationForm({
  invitationId,
  displayName,
}: {
  invitationId: string;
  displayName: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState(
    revokeInvitationAction,
    initialInvitationActionState,
  );

  useEffect(() => {
    if (state.status === "success") dialogRef.current?.close();
  }, [state.status]);

  function openConfirmation() {
    dialogRef.current?.showModal();
  }

  function closeConfirmation() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        className="invitation-revoke"
        type="button"
        aria-label={`Cofnij zaproszenie: ${displayName}`}
        onClick={openConfirmation}
      >
        <Ban aria-hidden="true" /> Cofnij
      </button>

      <dialog
        ref={dialogRef}
        className="invitation-revoke-dialog"
        aria-labelledby={`revoke-title-${invitationId}`}
        aria-describedby={`revoke-description-${invitationId}`}
        onClose={() => triggerRef.current?.focus()}
      >
        <div className="invitation-revoke-dialog-shell">
          <header>
            <span className="record-icon record-icon-red">
              <Ban aria-hidden="true" />
            </span>
            <div>
              <span className="section-kicker">Potwierdź zmianę</span>
              <h2 id={`revoke-title-${invitationId}`}>
                Cofnąć to zaproszenie?
              </h2>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={closeConfirmation}
              aria-label="Zamknij bez cofania zaproszenia"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <p id={`revoke-description-${invitationId}`}>
            Link lub kod dla <strong>{displayName}</strong> natychmiast
            przestanie działać. Jeśli będzie potrzebny ponownie, utwórz nowe
            zaproszenie.
          </p>

          <form action={action}>
            <input type="hidden" name="invitationId" value={invitationId} />
            <button
              className="button button-secondary"
              type="button"
              onClick={closeConfirmation}
            >
              Anuluj
            </button>
            <button
              className="button button-danger"
              type="submit"
              disabled={pending}
            >
              {pending ? (
                <>
                  <LoaderCircle className="spin" aria-hidden="true" />
                  Cofam…
                </>
              ) : (
                <>
                  <Ban aria-hidden="true" />
                  Tak, cofnij
                </>
              )}
            </button>
            {state.status === "error" ? (
              <p className="form-status error" role="alert">
                {state.message}
              </p>
            ) : null}
          </form>
        </div>
      </dialog>
    </>
  );
}
