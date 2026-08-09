"use client";

import { FileUp, LoaderCircle, Send } from "lucide-react";
import { useActionState, useState } from "react";

import { createContractAssignmentAction } from "../actions";

type ParentOption = {
  id: string;
  name: string;
  children: { id: string; name: string }[];
};

export function ContractCreateForm({ parents }: { parents: ParentOption[] }) {
  const [selectedParentId, setSelectedParentId] = useState("");
  const availableChildren =
    parents.find((parent) => parent.id === selectedParentId)?.children ?? [];
  const [state, action, pending] = useActionState(
    createContractAssignmentAction,
    { status: "idle" as const },
  );

  return (
    <form action={action} className="stage4-form">
      <div className="stage4-form-heading">
        <span className="stage4-icon"><FileUp aria-hidden="true" /></span>
        <div>
          <span className="section-kicker">Nowa umowa</span>
          <h2>Wyślij dokładną wersję PDF</h2>
          <p>Dokument po wysłaniu nie jest edytowany. Korekta będzie nową wersją.</p>
        </div>
      </div>

      <label>
        Nazwa umowy
        <input name="title" required maxLength={120} placeholder="np. Umowa na rok szkolny 2026/27" />
      </label>
      <div className="stage4-form-row">
        <label>
          Rodzic
          <select
            name="parentId"
            required
            value={selectedParentId}
            onChange={(event) => setSelectedParentId(event.target.value)}
          >
            <option value="" disabled>Wybierz rodzica</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>{parent.name}</option>
            ))}
          </select>
        </label>
        <label>
          Uczeń
          <select name="studentId" required defaultValue="" disabled={!selectedParentId}>
            <option value="" disabled>{selectedParentId ? "Wybierz ucznia" : "Najpierw wybierz rodzica"}</option>
            {availableChildren.map((child) => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>
          <small>System sprawdzi powiązanie z wybranym rodzicem.</small>
        </label>
      </div>
      <div className="stage4-form-row">
        <label>
          Dokument PDF
          <input name="document" type="file" required accept="application/pdf,.pdf" />
          <small>Maksymalnie 10 MB.</small>
        </label>
        <label>
          Ważna do (opcjonalnie)
          <input name="expiresAt" type="date" />
        </label>
      </div>

      {state.message ? (
        <p className={`stage4-feedback ${state.status}`} role="status">{state.message}</p>
      ) : null}
      <button className="stage4-primary" type="submit" disabled={pending || parents.length === 0}>
        {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
        {pending ? "Bezpiecznie zapisuję…" : "Wyślij rodzicowi"}
      </button>
    </form>
  );
}
