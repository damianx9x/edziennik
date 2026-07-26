"use client";

import {
  CheckCircle2,
  DoorOpen,
  GraduationCap,
  LoaderCircle,
  Plus,
  Users,
} from "lucide-react";
import { useActionState } from "react";

import {
  createGroupAction,
  createRoomAction,
} from "@/modules/groups/actions";
import { cefrLabels, cefrValues } from "@/modules/groups/schema";
import { initialRecordActionState } from "@/modules/groups/state";
import { createPersonAction } from "@/modules/people/actions";
import {
  recordRoleLabels,
  recordRoleValues,
} from "@/modules/people/schema";

export function QuickRecordForms() {
  const [roomState, roomAction, roomPending] = useActionState(
    createRoomAction,
    initialRecordActionState,
  );
  const [groupState, groupAction, groupPending] = useActionState(
    createGroupAction,
    initialRecordActionState,
  );
  const [personState, personAction, personPending] = useActionState(
    createPersonAction,
    initialRecordActionState,
  );

  return (
    <details className="records-create-panel" id="dodaj">
      <summary>
        <span className="record-icon record-icon-yellow">
          <Plus aria-hidden="true" />
        </span>
        <div>
          <span className="section-kicker">Pojedyncze pozycje</span>
          <strong>Dodaj nową kartotekę</strong>
          <small>Osoba, grupa albo sala — bez używania arkusza</small>
        </div>
      </summary>

      <div className="records-create-panel-body">
        <div className="quick-record-grid">
          <details className="quick-record-card">
          <summary>
            <span className="record-icon record-icon-yellow">
              <DoorOpen aria-hidden="true" />
            </span>
            <span>
              <strong>Nowa sala</strong>
              <small>Nazwa i opcjonalna liczba miejsc</small>
            </span>
          </summary>
          <form action={roomAction}>
            <label>
              Nazwa sali
              <input name="name" required maxLength={80} placeholder="Cambridge" />
            </label>
            <label>
              Liczba miejsc
              <input
                name="capacity"
                type="number"
                min={1}
                max={100}
                inputMode="numeric"
                placeholder="8"
              />
            </label>
            <RecordSubmit
              pending={roomPending}
              label="Dodaj salę"
              state={roomState}
            />
          </form>
          </details>

          <details className="quick-record-card">
          <summary>
            <span className="record-icon record-icon-blue">
              <GraduationCap aria-hidden="true" />
            </span>
            <span>
              <strong>Nowa grupa</strong>
              <small>Nazwa i orientacyjny poziom</small>
            </span>
          </summary>
          <form action={groupAction}>
            <label>
              Nazwa grupy
              <input name="name" required maxLength={100} placeholder="MONACO" />
            </label>
            <label>
              Poziom
              <select name="level" defaultValue="MIXED">
                {cefrValues.map((level) => (
                  <option key={level} value={level}>
                    {cefrLabels[level]}
                  </option>
                ))}
              </select>
            </label>
            <RecordSubmit
              pending={groupPending}
              label="Dodaj grupę"
              state={groupState}
            />
          </form>
          </details>

          <details className="quick-record-card">
          <summary>
            <span className="record-icon record-icon-red">
              <Users aria-hidden="true" />
            </span>
            <span>
              <strong>Nowa osoba</strong>
              <small>Wykładowca, rodzic albo uczeń</small>
            </span>
          </summary>
          <form action={personAction}>
            <label>
              Rola
              <select name="role" defaultValue="STUDENT">
                {recordRoleValues.map((role) => (
                  <option key={role} value={role}>
                    {recordRoleLabels[role]}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-two-columns">
              <label>
                Imię
                <input name="firstName" required maxLength={60} />
              </label>
              <label>
                Nazwisko
                <input name="lastName" required maxLength={80} />
              </label>
            </div>
            <label>
              E-mail
              <input
                name="email"
                type="email"
                maxLength={254}
                placeholder="Wymagany dla rodzica i wykładowcy"
              />
            </label>
            <div className="form-two-columns">
              <label>
                Telefon
                <input name="phone" type="tel" maxLength={30} />
              </label>
              <label>
                Id ucznia
                <input
                  name="externalId"
                  maxLength={80}
                  placeholder="Np. STU-001"
                />
              </label>
            </div>
            <RecordSubmit
              pending={personPending}
              label="Dodaj osobę"
              state={personState}
            />
          </form>
          </details>
        </div>
      </div>
    </details>
  );
}

function RecordSubmit({
  pending,
  label,
  state,
}: {
  pending: boolean;
  label: string;
  state: typeof initialRecordActionState;
}) {
  return (
    <>
      <button className="button button-primary" type="submit" disabled={pending}>
        {pending ? (
          <>
            <LoaderCircle className="spin" aria-hidden="true" />
            Zapisuję…
          </>
        ) : (
          label
        )}
      </button>
      {state.message ? (
        <p
          className={`form-status ${state.status === "success" ? "success" : "error"}`}
          role="status"
        >
          {state.status === "success" ? (
            <CheckCircle2 aria-hidden="true" />
          ) : null}
          {state.message}
        </p>
      ) : null}
    </>
  );
}
