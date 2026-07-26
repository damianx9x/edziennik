"use client";

import { Check, LoaderCircle, Send, Save } from "lucide-react";
import { useActionState } from "react";
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
  createdAt: string;
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
  if (entries.length === 0) {
    return (
      <p className="person-dialog-empty">
        Nie ma jeszcze zmian w tej kartotece. Pierwszy zapis pojawi się tutaj.
      </p>
    );
  }
  return (
    <ol className="record-history-list">
      {entries.map((entry) => (
        <li key={entry.id}>
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
        </li>
      ))}
    </ol>
  );
}
