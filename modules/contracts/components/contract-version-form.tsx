"use client";

import { FilePlus2, LoaderCircle } from "lucide-react";
import { useActionState, useState } from "react";

import { createContractVersionAction } from "../actions";

export function ContractVersionForm({
  contractId,
  assignmentId,
  initial,
}: {
  contractId: string;
  assignmentId: string;
  initial: {
    title: string;
    acceptanceMode: "DOCUMENTARY" | "EXTERNAL_SIGNATURE";
    serviceSummary: string;
    requiresPayment: boolean;
    paymentSummary: string | null;
    paymentAmountCents: number | null;
    paymentLabel: string | null;
    paymentDueDate: string | null;
  };
}) {
  const [requiresPayment, setRequiresPayment] = useState(initial.requiresPayment);
  const [state, action, pending] = useActionState(createContractVersionAction, {
    status: "idle" as const,
  });
  return (
    <details className="contract-version-details">
      <summary><FilePlus2 aria-hidden="true" /> Edytuj — utwórz nową wersję</summary>
      <form action={action}>
        <input type="hidden" name="contractId" value={contractId} />
        <input type="hidden" name="sourceAssignmentId" value={assignmentId} />
        <div className="contract-version-grid">
          <label>
            Nazwa umowy
            <input name="title" defaultValue={initial.title} maxLength={120} required />
          </label>
          <label>
            Sposób zawarcia
            <select name="acceptanceMode" defaultValue={initial.acceptanceMode} required>
              <option value="DOCUMENTARY">Akceptacja w eDzienniku</option>
              <option value="EXTERNAL_SIGNATURE">Podpis poza systemem</option>
            </select>
          </label>
        </div>
        <label>
          Zakres i okres usługi
          <textarea name="serviceSummary" defaultValue={initial.serviceSummary} rows={3} maxLength={500} required />
        </label>
        <label>
          Czy wersja tworzy obowiązek zapłaty?
          <select
            name="requiresPayment"
            value={requiresPayment ? "yes" : "no"}
            onChange={(event) => setRequiresPayment(event.target.value === "yes")}
          >
            <option value="yes">Tak — umowa odpłatna</option>
            <option value="no">Nie — bez obowiązku zapłaty</option>
          </select>
        </label>
        {requiresPayment ? (
          <div className="contract-version-payment-fields">
            <label>
              Kwota brutto (PLN)
              <input
                name="paymentAmount"
                inputMode="decimal"
                defaultValue={initial.paymentAmountCents === null ? "" : (initial.paymentAmountCents / 100).toFixed(2).replace(".", ",")}
                required
              />
            </label>
            <label>
              Nazwa płatności
              <input name="paymentLabel" defaultValue={initial.paymentLabel ?? ""} maxLength={80} required />
            </label>
            <label>
              Termin płatności
              <input name="paymentDueDate" type="date" defaultValue={initial.paymentDueDate?.slice(0, 10) ?? ""} required />
            </label>
            <label className="contract-version-payment-summary">
              Pozostałe zasady płatności
              <textarea name="paymentSummary" defaultValue={initial.paymentSummary ?? ""} rows={3} maxLength={500} required />
            </label>
          </div>
        ) : (
          <>
            <input type="hidden" name="paymentAmount" value="" />
            <input type="hidden" name="paymentLabel" value="" />
            <input type="hidden" name="paymentDueDate" value="" />
            <input type="hidden" name="paymentSummary" value="" />
          </>
        )}
        <label>
          Nowy dokument PDF
          <input name="document" type="file" accept="application/pdf,.pdf" required />
        </label>
        <label className="stage4-check stage4-legal-check">
          <input type="checkbox" name="legalReadiness" value="confirmed" required />
          <span>Sprawdziłem/am poprawioną treść, warunki płatności i właściwy sposób zawarcia umowy.</span>
        </label>
        <p>Poprzedniego pliku, warunków ani akceptacji nie zmienimy. Rodzic otrzyma nową wersję.</p>
        {state.message ? <p className={`stage4-feedback ${state.status}`} role="status">{state.message}</p> : null}
        <button className="stage4-primary" type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <FilePlus2 aria-hidden="true" />}
          {pending ? "Tworzę wersję…" : "Wyślij nową wersję"}
        </button>
      </form>
    </details>
  );
}
