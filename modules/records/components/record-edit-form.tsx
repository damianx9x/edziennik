"use client";

import { Check, Info, LoaderCircle, Send, Save, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { updateRecordAction } from "@/modules/records/actions";
import {
  initialRecordUpdateState,
} from "@/modules/records/state";

export type RecordHistoryEntry = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DIRECT";
  label: string;
  actorName: string;
  reviewerName?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  sortKey: string;
  fields: string[];
};

const fieldLabels: Record<string, string> = {
  name: "nazwa / imię i nazwisko",
  email: "e-mail",
  phone: "telefon",
  externalId: "identyfikator",
  capacity: "liczba miejsc",
  cefrLevel: "poziom CEFR",
  locationId: "lokalizacja",
  groupAssignment: "przypisanie do grupy",
  studentAssignment: "lista uczniów",
  childLink: "powiązanie z dzieckiem",
  parentLink: "powiązanie z rodzicem",
};

function SubmitButton({ isDirector }: { isDirector: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="button button-primary" type="submit" disabled={pending}>
      {pending ? (
        <>
          <LoaderCircle className="spin" aria-hidden="true" /> Zapisuję…
        </>
      ) : isDirector ? (
        <>
          <Save aria-hidden="true" /> Zapisz zmiany
        </>
      ) : (
        <>
          <Send aria-hidden="true" /> Wyślij do zatwierdzenia
        </>
      )}
    </button>
  );
}

export function RecordEditForm({
  entityType,
  entityId,
  isDirector,
  children,
}: {
  entityType: "USER" | "ROOM" | "GROUP";
  entityId: string;
  isDirector: boolean;
  children: React.ReactNode;
}) {
  const [state, action] = useActionState(
    updateRecordAction,
    initialRecordUpdateState,
  );
  return (
    <form className="record-edit-form" action={action}>
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      {children}
      {state.status !== "idle" ? (
        <div
          className={`auth-message ${
            state.status === "success"
              ? "auth-message-success"
              : "auth-message-error"
          }`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.status === "success" ? <Check aria-hidden="true" /> : null}
          {state.message}
        </div>
      ) : null}
      {!isDirector ? (
        <p className="record-review-note">
          Dyrektor zobaczy propozycję w centrum powiadomień. Dane zmienią się
          dopiero po zatwierdzeniu.
        </p>
      ) : null}
      <SubmitButton isDirector={isDirector} />
    </form>
  );
}

export function RecordHistory({ entries }: { entries: RecordHistoryEntry[] }) {
  const [selected, setSelected] = useState<RecordHistoryEntry | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  if (entries.length === 0) {
    return (
      <p className="person-dialog-empty">
        Nie ma jeszcze zmian w tej kartotece. Pierwszy zapis pojawi się tutaj.
      </p>
    );
  }
  return (
    <>
      <ol className="record-history-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className="record-history-open"
              onClick={() => {
                setSelected(entry);
                requestAnimationFrame(() => dialogRef.current?.showModal());
              }}
              aria-label={`Pokaż szczegóły: ${entry.label}`}
            >
          <span className={`record-history-status status-${entry.status.toLowerCase()}`}>
            {entry.status === "PENDING"
              ? "Czeka"
              : entry.status === "REJECTED"
                ? "Odrzucona"
                : "Zapisana"}
          </span>
          <div>
            <strong>{entry.label}</strong>
            <p>
              {entry.fields.map((field) => fieldLabels[field] ?? field).join(", ")}
            </p>
            <small>
              {entry.actorName} · {entry.createdAt}
            </small>
          </div>
              <Info aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <dialog
        ref={dialogRef}
        className="record-history-dialog"
        onClose={() => setSelected(null)}
        aria-labelledby="record-history-dialog-title"
      >
        {selected ? (
          <div>
            <header>
              <div>
                <span className="section-kicker">Pełna historia operacji</span>
                <h3 id="record-history-dialog-title">{selected.label}</h3>
              </div>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Zamknij szczegóły historii"
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <dl>
              <div><dt>Kto</dt><dd>{selected.actorName}</dd></div>
              <div><dt>Kiedy</dt><dd>{selected.createdAt}</dd></div>
              {selected.reviewerName ? <div><dt>Decyzję podjął</dt><dd>{selected.reviewerName}</dd></div> : null}
              {selected.reviewedAt ? <div><dt>Czas decyzji</dt><dd>{selected.reviewedAt}</dd></div> : null}
              <div><dt>Status</dt><dd>{historyStatusLabel(selected.status)}</dd></div>
              <div><dt>Źródło</dt><dd>{selected.status === "DIRECT" ? "Bezpośrednia edycja dyrektora" : "Propozycja zmiany wykładowcy"}</dd></div>
              <div><dt>Zakres</dt><dd>{selected.fields.map((field) => fieldLabels[field] ?? field).join(", ")}</dd></div>
              <div><dt>Identyfikator</dt><dd><code>{selected.id}</code></dd></div>
            </dl>
            <p>Historia pokazuje metadane operacji. Wartości danych osobowych nie są kopiowane do logu.</p>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

function historyStatusLabel(status: RecordHistoryEntry["status"]) {
  if (status === "PENDING") return "Czeka na zatwierdzenie";
  if (status === "REJECTED") return "Odrzucona";
  if (status === "APPROVED") return "Zatwierdzona";
  return "Zapisana bezpośrednio";
}
