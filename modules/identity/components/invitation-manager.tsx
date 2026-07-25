"use client";

import {
  Check,
  Clipboard,
  LoaderCircle,
  MailPlus,
  ShieldCheck,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createInvitationAction,
} from "@/modules/identity/invitations/actions";
import { invitationRoleLabels } from "@/modules/identity/invitations/schema";
import { initialInvitationActionState } from "@/modules/identity/invitations/state";

function SubmitInvitationButton() {
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
          Tworzę zaproszenie…
        </>
      ) : (
        <>
          <MailPlus aria-hidden="true" />
          Utwórz i wyślij zaproszenie
        </>
      )}
    </button>
  );
}

export function InvitationManager() {
  const [state, formAction] = useActionState(
    createInvitationAction,
    initialInvitationActionState,
  );
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  async function copyLink() {
    if (!state.invitationLink) return;
    try {
      await navigator.clipboard.writeText(state.invitationLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="invite-create-card" aria-labelledby="invite-title">
      <div className="invite-card-heading">
        <div className="auth-card-icon">
          <MailPlus aria-hidden="true" />
        </div>
        <div>
          <span className="section-kicker">Nowe konto</span>
          <h2 id="invite-title">Zaproś jedną osobę</h2>
          <p>
            Osoba sama ustawi hasło. Link działa raz i wygasa po 7 dniach.
          </p>
        </div>
      </div>

      <form
        ref={formRef}
        className="auth-form invite-form"
        action={formAction}
      >
        <div className="invite-form-grid">
          <label>
            <span>Imię i nazwisko</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              required
              placeholder="np. Anna Kowalska"
            />
          </label>
          <label>
            <span>Rola w eDzienniku</span>
            <select name="role" defaultValue="PARENT" required>
              {Object.entries(invitationRoleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span>Adres e-mail</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="adres@domena.pl"
          />
        </label>

        {state.status !== "idle" ? (
          <div
            className={`auth-message ${
              state.status === "success"
                ? "auth-message-success"
                : "auth-message-error"
            }`}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.status === "success" ? (
              <Check aria-hidden="true" />
            ) : null}
            {state.message}
          </div>
        ) : null}

        {state.status === "success" && state.invitationLink ? (
          <div className="invite-link-box">
            <div>
              <ShieldCheck aria-hidden="true" />
              <span>
                Bezpieczny link
                <small>Udostępnij tylko zaproszonej osobie.</small>
              </span>
            </div>
            <code>{state.invitationLink}</code>
            <button
              className="button button-secondary button-full"
              type="button"
              onClick={copyLink}
            >
              {copied ? (
                <>
                  <Check aria-hidden="true" /> Skopiowano
                </>
              ) : (
                <>
                  <Clipboard aria-hidden="true" /> Skopiuj link
                </>
              )}
            </button>
          </div>
        ) : null}

        <SubmitInvitationButton />
      </form>
    </section>
  );
}
