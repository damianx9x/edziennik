"use client";

import {
  Check,
  Clipboard,
  Download,
  Link2,
  LoaderCircle,
  MailPlus,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createInvitationAction,
  createRoleQrInvitationAction,
} from "@/modules/identity/invitations/actions";
import {
  invitationRoleLabels,
  invitationValidityLabels,
} from "@/modules/identity/invitations/schema";
import { invitableIdentityRoleValues } from "@/modules/identity/auth/access";
import {
  initialInvitationActionState,
  type InvitationActionState,
} from "@/modules/identity/invitations/state";

function SubmitInvitationButton({
  mode,
}: {
  mode: "email" | "qr";
}) {
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
          {mode === "qr" ? "Tworzę kod…" : "Tworzę zaproszenie…"}
        </>
      ) : mode === "qr" ? (
        <>
          <QrCode aria-hidden="true" />
          Wygeneruj kod QR
        </>
      ) : (
        <>
          <MailPlus aria-hidden="true" />
          Utwórz i wyślij
        </>
      )}
    </button>
  );
}

function InvitationResult({ state }: { state: InvitationActionState }) {
  const [copiedLink, setCopiedLink] = useState("");
  const [qrData, setQrData] = useState({ link: "", image: "" });

  useEffect(() => {
    if (!state.invitationLink || state.invitationKind !== "ROLE_QR") return;

    let cancelled = false;
    void QRCode.toDataURL(state.invitationLink, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#101c3d", light: "#ffffff" },
    }).then((image) => {
      if (!cancelled) setQrData({ link: state.invitationLink!, image });
    });
    return () => {
      cancelled = true;
    };
  }, [state.invitationKind, state.invitationLink]);

  async function copyLink() {
    if (!state.invitationLink) return;
    try {
      await navigator.clipboard.writeText(state.invitationLink);
      setCopiedLink(state.invitationLink);
    } catch {
      setCopiedLink("");
    }
  }

  if (state.status === "idle") return null;
  if (state.status === "error") {
    return (
      <div className="auth-message auth-message-error" role="alert">
        {state.message}
      </div>
    );
  }

  return (
    <>
      <div className="auth-message auth-message-success" role="status">
        <Check aria-hidden="true" />
        {state.message}
      </div>
      {state.invitationLink ? (
        <div
          className={
            state.invitationKind === "ROLE_QR"
              ? "invite-access-box"
              : "invite-access-box invite-access-box-single"
          }
        >
          <div className="invite-link-box">
            <div>
              <ShieldCheck aria-hidden="true" />
              <span>
                Jednorazowy link
                <small>Udostępnij go wyłącznie właściwej osobie.</small>
              </span>
            </div>
            <code>{state.invitationLink}</code>
            <button
              className="button button-secondary button-full"
              type="button"
              onClick={copyLink}
            >
              {copiedLink === state.invitationLink ? (
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
          {state.invitationKind === "ROLE_QR" ? (
            <div className="invite-qr-box">
              <div>
                <QrCode aria-hidden="true" />
                <span>
                  {state.roleLabel ?? "Kod do rejestracji"}
                  <small>
                    Rola jest przypisana do kodu i nie może zostać zmieniona.
                  </small>
                </span>
              </div>
              {qrData.link === state.invitationLink && qrData.image ? (
                <>
                  <Image
                    src={qrData.image}
                    alt={`Jednorazowy kod QR dla roli ${state.roleLabel ?? ""}`}
                    width={260}
                    height={260}
                    unoptimized
                  />
                  <a
                    className="button button-secondary button-full"
                    href={qrData.image}
                    download={`zaproszenie-kla-${(state.roleLabel ?? "konto").toLocaleLowerCase("pl-PL")}.png`}
                  >
                    <Download aria-hidden="true" /> Pobierz kod
                  </a>
                </>
              ) : (
                <span className="invite-qr-loading" role="status">
                  Tworzę kod QR…
                </span>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function InvitationManager() {
  const [mode, setMode] = useState<"email" | "qr">("email");
  const [emailState, emailAction] = useActionState(
    createInvitationAction,
    initialInvitationActionState,
  );
  const [qrState, qrAction] = useActionState(
    createRoleQrInvitationAction,
    initialInvitationActionState,
  );
  const emailFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (emailState.status === "success") emailFormRef.current?.reset();
  }, [emailState.status]);

  return (
    <section className="invite-create-card" aria-labelledby="invite-title">
      <div className="invite-card-heading">
        <div className="auth-card-icon">
          {mode === "qr" ? (
            <QrCode aria-hidden="true" />
          ) : (
            <MailPlus aria-hidden="true" />
          )}
        </div>
        <div>
          <span className="section-kicker">Nowe konto</span>
          <h2 id="invite-title">Wybierz sposób zaproszenia</h2>
          <p>
            Rola jest zapisywana w zaproszeniu. Osoba zaproszona nie może jej
            samodzielnie zmienić.
          </p>
        </div>
      </div>

      <div className="invite-method-switch" role="tablist" aria-label="Sposób zaproszenia">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "email"}
          className={mode === "email" ? "is-active" : undefined}
          onClick={() => setMode("email")}
        >
          <MailPlus aria-hidden="true" />
          Zaproś e-mailem
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "qr"}
          className={mode === "qr" ? "is-active" : undefined}
          onClick={() => setMode("qr")}
        >
          <QrCode aria-hidden="true" />
          Zaproś kodem QR
        </button>
      </div>

      {mode === "email" ? (
        <form ref={emailFormRef} className="auth-form invite-form" action={emailAction}>
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
              <small>Tak osoba będzie podpisana w eDzienniku.</small>
            </label>
            <label>
              <span>Rola w eDzienniku</span>
              <select name="role" defaultValue="PARENT" required>
                {invitableIdentityRoleValues.map((value) => (
                  <option key={value} value={value}>
                    {invitationRoleLabels[value]}
                  </option>
                ))}
              </select>
              <small>Rola ustawi właściwe uprawnienia po rejestracji.</small>
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
            <small>Na ten adres zostanie wysłany jednorazowy link.</small>
          </label>
          <InvitationResult state={emailState} />
          <SubmitInvitationButton mode="email" />
        </form>
      ) : (
        <form className="auth-form invite-form" action={qrAction}>
          <div className="invite-qr-intro">
            <Link2 aria-hidden="true" />
            <p>
              Wygenerujesz czasowy, jednorazowy kod. Osoba po zeskanowaniu sama
              wpisze swoje dane, a konto od razu otrzyma wybraną rolę.
            </p>
          </div>
          <div className="invite-form-grid">
            <label>
              <span>Rola przypisana do kodu</span>
              <select name="role" defaultValue="PARENT" required>
                {invitableIdentityRoleValues.map((value) => (
                  <option key={value} value={value}>
                    {invitationRoleLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Jak długo kod ma działać?</span>
              <select name="validity" defaultValue="1h" required>
                {Object.entries(invitationValidityLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
          <InvitationResult state={qrState} />
          <SubmitInvitationButton mode="qr" />
        </form>
      )}
    </section>
  );
}
