"use client";

import {
  Check,
  Clipboard,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldAlert,
  X,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  createTemporaryPasswordAction,
  sendUserPasswordResetAction,
  type PasswordResetActionState,
} from "@/modules/identity/password-reset-actions";

const initialState: PasswordResetActionState = { status: "idle" };

export function PasswordResetButton({
  userId,
  compact = false,
}: {
  userId: string;
  compact?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`person-password-reset${compact ? " is-compact" : ""}`}>
      <button
        className={compact ? "button button-secondary" : "person-module-action"}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <KeyRound aria-hidden="true" />
        {compact ? (
          <span>Reset hasła</span>
        ) : (
          <span>
            <strong>Reset hasła</strong>
            <small>Link e-mail lub hasło tymczasowe</small>
          </span>
        )}
      </button>

      {isOpen
        ? createPortal(
            <PasswordResetDialog userId={userId} onDismiss={() => setIsOpen(false)} />,
            document.body,
          )
        : null}
    </div>
  );
}

function PasswordResetDialog({ userId, onDismiss }: { userId: string; onDismiss: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [linkState, linkAction, linkPending] = useActionState(
    sendUserPasswordResetAction,
    initialState,
  );
  const [temporaryState, temporaryAction, temporaryPending] = useActionState(
    createTemporaryPasswordAction,
    initialState,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function copyPassword() {
    if (!temporaryState.temporaryPassword) return;
    await navigator.clipboard.writeText(temporaryState.temporaryPassword);
    setCopied(true);
  }

  return (
    <dialog
      className="password-reset-dialog"
      ref={dialogRef}
      onClose={onDismiss}
      onCancel={(event) => {
        event.preventDefault();
        dialogRef.current?.close();
      }}
    >
      <div className="password-reset-dialog-card">
        <header>
          <div>
            <span className="section-kicker">Pomoc z dostępem</span>
            <h2>Wybierz sposób resetu</h2>
            <p>Każda operacja zostanie zapisana w historii bezpieczeństwa.</p>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Zamknij reset hasła"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <section className="password-reset-option is-recommended">
          <div className="password-reset-option-heading">
            <Mail aria-hidden="true" />
            <div>
              <strong>Bezpieczny link e-mail</strong>
              <span>Użytkownik sam wybiera nowe hasło.</span>
            </div>
          </div>
          <form action={linkAction}>
            <input type="hidden" name="userId" value={userId} />
            <button className="button button-primary button-full" type="submit" disabled={linkPending}>
              {linkPending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Mail aria-hidden="true" />}
              Wyślij link do zmiany hasła
            </button>
          </form>
          {linkState.message ? (
            <p className={`record-form-message is-${linkState.status}`} role="status">
              {linkState.message}
            </p>
          ) : null}
        </section>

        <section className="password-reset-option">
          <div className="password-reset-option-heading">
            <ShieldAlert aria-hidden="true" />
            <div>
              <strong>Hasło tymczasowe</strong>
              <span>Ważne 30 minut, widoczne tylko raz i obowiązkowo zmieniane po logowaniu.</span>
            </div>
          </div>

          {temporaryState.temporaryPassword ? (
            <div className="temporary-password-result" role="status">
              <span>Hasło tymczasowe</span>
              <code>{temporaryState.temporaryPassword}</code>
              <button className="button button-secondary button-full" type="button" onClick={copyPassword}>
                {copied ? <Check aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
                {copied ? "Skopiowano" : "Skopiuj hasło"}
              </button>
              <small>Po zamknięciu okna hasła nie da się ponownie wyświetlić.</small>
            </div>
          ) : (
            <form action={temporaryAction} className="temporary-password-actions">
              <input type="hidden" name="userId" value={userId} />
              <button
                className="button button-secondary"
                type="submit"
                name="delivery"
                value="show"
                disabled={temporaryPending}
              >
                {temporaryPending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
                Wygeneruj i pokaż
              </button>
              <button
                className="button button-secondary"
                type="submit"
                name="delivery"
                value="email"
                disabled={temporaryPending}
              >
                <Mail aria-hidden="true" /> Wyślij e-mailem
              </button>
            </form>
          )}
          {temporaryState.message ? (
            <p className={`record-form-message is-${temporaryState.status}`} role="status">
              {temporaryState.message}
            </p>
          ) : null}
        </section>
      </div>
    </dialog>
  );
}
