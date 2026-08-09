"use client";

import { FilePlus2, LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { createContractVersionAction } from "../actions";

export function ContractVersionForm({
  contractId,
  assignmentId,
}: {
  contractId: string;
  assignmentId: string;
}) {
  const [state, action, pending] = useActionState(createContractVersionAction, {
    status: "idle" as const,
  });
  return (
    <details className="contract-version-details">
      <summary><FilePlus2 aria-hidden="true" /> Dodaj poprawioną wersję</summary>
      <form action={action}>
        <input type="hidden" name="contractId" value={contractId} />
        <input type="hidden" name="sourceAssignmentId" value={assignmentId} />
        <label>
          Nowy dokument PDF
          <input name="document" type="file" accept="application/pdf,.pdf" required />
        </label>
        <p>Poprzedniego pliku ani akceptacji nie zmienimy.</p>
        {state.message ? <p className={`stage4-feedback ${state.status}`} role="status">{state.message}</p> : null}
        <button className="stage4-primary" type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <FilePlus2 aria-hidden="true" />}
          {pending ? "Tworzę wersję…" : "Wyślij nową wersję"}
        </button>
      </form>
    </details>
  );
}
