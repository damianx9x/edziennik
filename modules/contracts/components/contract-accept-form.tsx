"use client";

import { CheckCircle2, CircleHelp, LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { acceptContractAction } from "../actions";

export function ContractAcceptForm({
  assignmentId,
  statement,
  actionLabel,
  requiresPayment,
  requiresEarlyStartRequest,
}: {
  assignmentId: string;
  statement: string;
  actionLabel: string;
  requiresPayment: boolean;
  requiresEarlyStartRequest: boolean;
}) {
  const [state, action, pending] = useActionState(acceptContractAction, {
    status: "idle" as const,
  });

  if (state.status === "success") {
    return (
      <div className="contract-accept-success" role="status">
        <CheckCircle2 aria-hidden="true" />
        <div>
          <strong>Umowa została zawarta</strong>
          <span>{state.message}</span>
        </div>
        <a className="stage4-secondary" href={`/panel/umowy/${assignmentId}/potwierdzenie`}>
          Pobierz potwierdzenie
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="contract-accept-form">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <div className="contract-decision-heading">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>Ostatni krok — sprawdź i zdecyduj</strong>
          <span>Każde pole dotyczy innej, ważnej informacji.</span>
        </div>
        <Link href="/panel/umowy/pomoc"><CircleHelp aria-hidden="true" /> Jak to działa prawnie?</Link>
      </div>
      <label className="stage4-check">
        <input type="checkbox" name="documentConfirmation" value="accepted" required />
        <span>Otrzymałem/am i przeczytałem/am dokument PDF. Akceptuję dokładnie wyświetloną wersję umowy.</span>
      </label>
      <label className="stage4-check">
        <input type="checkbox" name="consumerInformationConfirmation" value="accepted" required />
        <span>Otrzymałem/am informacje o umowie zawieranej na odległość, prawie odstąpienia, reklamacji oraz zasadach zakończenia umowy.</span>
      </label>
      {requiresPayment ? (
        <label className="stage4-check contract-payment-confirmation">
          <input type="checkbox" name="paymentConfirmation" value="accepted" required />
          <span>Rozumiem, że kliknięcie przycisku poniżej zawiera umowę i powoduje obowiązek zapłaty na pokazanych warunkach.</span>
        </label>
      ) : null}
      {requiresEarlyStartRequest ? (
        <fieldset className="contract-early-start-confirmations">
          <legend>Jeśli zajęcia mają rozpocząć się wcześniej</legend>
          <label className="stage4-check">
            <input type="checkbox" name="earlyStartRequest" value="accepted" required />
            <span>Wyraźnie żądam rozpoczęcia świadczenia usługi przed upływem 14 dni od zawarcia umowy.</span>
          </label>
          <label className="stage4-check">
            <input type="checkbox" name="earlyStartConsequences" value="accepted" required />
            <span>Przyjmuję do wiadomości, że po odstąpieniu szkoła może rozliczyć usługę wykonaną do tej chwili, a po jej pełnym wykonaniu — przy spełnieniu warunków ustawowych — prawo odstąpienia może wygasnąć.</span>
          </label>
        </fieldset>
      ) : null}
      <details className="contract-statement-details">
        <summary>Pełna treść zapisywanego oświadczenia</summary>
        <p>{statement}</p>
      </details>
      {state.message ? (
        <p className={`stage4-feedback ${state.status}`} role="status">{state.message}</p>
      ) : null}
      <button className="stage4-primary" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
        {pending ? "Zapisuję akceptację…" : actionLabel}
      </button>
      {requiresPayment ? (
        <small className="contract-action-explanation">Kliknięcie tego przycisku kończy zawarcie odpłatnej umowy.</small>
      ) : null}
    </form>
  );
}
