"use client";

import { useEffect, useRef, type ComponentPropsWithRef } from "react";
import { useFormStatus } from "react-dom";

type ActionState = { status: string };

/** React resets uncontrolled inputs after any resolved action, including a
 * domain validation error. Only a confirmed success may clear this form.
 * Values and selected files stay in the current DOM, never in browser storage. */
export function ActionForm({ state, children, ref: forwardedRef, onReset, ...props }:
  ComponentPropsWithRef<"form"> & { state: ActionState }) {
  const form = useRef<HTMLFormElement | null>(null);
  const allowReset = useRef(false);
  useEffect(() => {
    if (state.status !== "success") return;
    allowReset.current = true;
    form.current?.reset();
    allowReset.current = false;
  }, [state]);
  return <form {...props} ref={(node) => {
    form.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }} onReset={(event) => {
    if (!allowReset.current) event.preventDefault();
    onReset?.(event);
  }}>
    {children}
    <FormTransferStatus />
  </form>;
}

function FormTransferStatus() {
  const { pending, data } = useFormStatus();
  const hasFile = pending && data && Array.from(data.values()).some(
    (value) => typeof value !== "string" && value.size > 0,
  );
  if (!hasFile) return null;
  return <div className="form-transfer-status" role="status" aria-live="polite">
    <progress aria-label="Wysyłanie i sprawdzanie pliku" />
    <span>Wysyłanie i sprawdzanie pliku… Poczekaj na potwierdzenie. Nie zamykaj tego okna.</span>
  </div>;
}
