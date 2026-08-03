"use client";

import {
  CheckCircle2,
  DoorOpen,
  GraduationCap,
  LoaderCircle,
  MapPin,
  Plus,
  Users,
} from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import {
  createGroupAction,
  createLocationAction,
  createRoomAction,
} from "@/modules/groups/actions";
import { cefrLabels, cefrValues } from "@/modules/groups/schema";
import { initialRecordActionState } from "@/modules/groups/state";
import { createPersonAction } from "@/modules/people/actions";
import {
  recordRoleLabels,
  recordRoleValues,
} from "@/modules/people/schema";

type LocationOption = {
  id: string;
  name: string;
  isOnline: boolean;
};

export function QuickRecordForms({
  locations,
}: {
  locations: LocationOption[];
}) {
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
  const [locationState, locationAction, locationPending] = useActionState(
    createLocationAction,
    initialRecordActionState,
  );
  const roomFormRef = useRef<HTMLFormElement>(null);
  const roomDetailsRef = useRef<HTMLDetailsElement>(null);
  const groupFormRef = useRef<HTMLFormElement>(null);
  const groupDetailsRef = useRef<HTMLDetailsElement>(null);
  const personFormRef = useRef<HTMLFormElement>(null);
  const personDetailsRef = useRef<HTMLDetailsElement>(null);
  const locationFormRef = useRef<HTMLFormElement>(null);
  const locationDetailsRef = useRef<HTMLDetailsElement>(null);
  const successRegionRef = useRef<HTMLParagraphElement>(null);
  const successMessageRef = useRef<HTMLSpanElement>(null);

  function hidePreviousSuccess(event: React.SyntheticEvent<HTMLDetailsElement>) {
    if (event.currentTarget.open && successRegionRef.current) {
      successRegionRef.current.hidden = true;
    }
  }

  useEffect(() => {
    if (roomState.status === "success") {
      roomFormRef.current?.reset();
      if (roomDetailsRef.current) {
        roomDetailsRef.current.open = false;
        roomDetailsRef.current.querySelector("summary")?.focus();
      }
      if (successMessageRef.current) {
        successMessageRef.current.textContent = `${
          roomState.message ?? "Sala została dodana."
        } Formularz został wyczyszczony.`;
      }
      if (successRegionRef.current) successRegionRef.current.hidden = false;
    } else if (roomState.status === "error") {
      if (successRegionRef.current) successRegionRef.current.hidden = true;
    }
  }, [roomState]);

  useEffect(() => {
    if (groupState.status === "success") {
      groupFormRef.current?.reset();
      if (groupDetailsRef.current) {
        groupDetailsRef.current.open = false;
        groupDetailsRef.current.querySelector("summary")?.focus();
      }
      if (successMessageRef.current) {
        successMessageRef.current.textContent = `${
          groupState.message ?? "Grupa została dodana."
        } Formularz został wyczyszczony.`;
      }
      if (successRegionRef.current) successRegionRef.current.hidden = false;
    } else if (groupState.status === "error") {
      if (successRegionRef.current) successRegionRef.current.hidden = true;
    }
  }, [groupState]);

  useEffect(() => {
    if (personState.status === "success") {
      personFormRef.current?.reset();
      if (personDetailsRef.current) {
        personDetailsRef.current.open = false;
        personDetailsRef.current.querySelector("summary")?.focus();
      }
      if (successMessageRef.current) {
        successMessageRef.current.textContent = `${
          personState.message ?? "Osoba została dodana."
        } Formularz został wyczyszczony.`;
      }
      if (successRegionRef.current) successRegionRef.current.hidden = false;
    } else if (personState.status === "error") {
      if (successRegionRef.current) successRegionRef.current.hidden = true;
    }
  }, [personState]);

  useEffect(() => {
    if (locationState.status === "success") {
      locationFormRef.current?.reset();
      if (locationDetailsRef.current) {
        locationDetailsRef.current.open = false;
        locationDetailsRef.current.querySelector("summary")?.focus();
      }
      if (successMessageRef.current) {
        successMessageRef.current.textContent = `${
          locationState.message ?? "Lokalizacja została dodana."
        } Formularz został wyczyszczony.`;
      }
      if (successRegionRef.current) successRegionRef.current.hidden = false;
    } else if (locationState.status === "error") {
      if (successRegionRef.current) successRegionRef.current.hidden = true;
    }
  }, [locationState]);

  return (
    <div className="records-create-panel records-create-panel-static">
      <div className="records-create-panel-heading">
        <span className="record-icon record-icon-yellow">
          <Plus aria-hidden="true" />
        </span>
        <div>
          <span className="section-kicker">Pojedyncze pozycje</span>
          <strong>Dodaj nową kartotekę</strong>
          <small>Wybierz osobę, lokalizację, grupę albo salę</small>
        </div>
      </div>

      <div className="records-create-panel-body">
        <p
          ref={successRegionRef}
          className="form-status success quick-record-success"
          role="status"
          hidden
        >
          <CheckCircle2 aria-hidden="true" />
          <span ref={successMessageRef} />
        </p>
        <div className="quick-record-grid">
          <details
            ref={roomDetailsRef}
            className="quick-record-card"
            onToggle={hidePreviousSuccess}
          >
          <summary>
            <span className="record-icon record-icon-yellow">
              <DoorOpen aria-hidden="true" />
            </span>
            <span>
              <strong>Nowa sala</strong>
              <small>Nazwa i opcjonalna liczba miejsc</small>
            </span>
          </summary>
          <form ref={roomFormRef} action={roomAction}>
            <LocationSelect locations={locations} />
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

          <details
            ref={groupDetailsRef}
            className="quick-record-card"
            onToggle={hidePreviousSuccess}
          >
          <summary>
            <span className="record-icon record-icon-blue">
              <GraduationCap aria-hidden="true" />
            </span>
            <span>
              <strong>Nowa grupa</strong>
              <small>Nazwa i orientacyjny poziom</small>
            </span>
          </summary>
          <form ref={groupFormRef} action={groupAction}>
            <LocationSelect locations={locations} />
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

          <details
            ref={locationDetailsRef}
            className="quick-record-card"
            onToggle={hidePreviousSuccess}
          >
          <summary>
            <span className="record-icon record-icon-blue">
              <MapPin aria-hidden="true" />
            </span>
            <span>
              <strong>Nowa lokalizacja</strong>
              <small>Oddział stacjonarny albo zajęcia online</small>
            </span>
          </summary>
          <form ref={locationFormRef} action={locationAction}>
            <label>
              Nazwa lokalizacji
              <input
                name="name"
                required
                maxLength={100}
                placeholder="Gdańsk Morena"
              />
            </label>
            <label>
              Adres <small>(opcjonalnie)</small>
              <input
                name="address"
                maxLength={200}
                placeholder="Ulica i numer"
              />
            </label>
            <label className="record-checkbox">
              <input name="isOnline" type="checkbox" />
              To lokalizacja online
            </label>
            <RecordSubmit
              pending={locationPending}
              label="Dodaj lokalizację"
              state={locationState}
            />
          </form>
          </details>

          <details
            ref={personDetailsRef}
            className="quick-record-card"
            onToggle={hidePreviousSuccess}
          >
          <summary>
            <span className="record-icon record-icon-red">
              <Users aria-hidden="true" />
            </span>
            <span>
              <strong>Nowa osoba</strong>
              <small>Wykładowca, rodzic albo uczeń</small>
            </span>
          </summary>
          <form ref={personFormRef} action={personAction}>
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
    </div>
  );
}

function LocationSelect({ locations }: { locations: LocationOption[] }) {
  return (
    <label>
      Lokalizacja
      <select name="locationId" required defaultValue="">
        <option value="" disabled>
          Wybierz lokalizację
        </option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}{location.isOnline ? " · online" : ""}
          </option>
        ))}
      </select>
    </label>
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
      {state.status === "error" && state.message ? (
        <p
          className="form-status error"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}
    </>
  );
}
