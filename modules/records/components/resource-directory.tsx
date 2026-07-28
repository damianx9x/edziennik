"use client";

import {
  Archive,
  ChevronRight,
  DoorOpen,
  GraduationCap,
  GripHorizontal,
  History,
  MapPin,
  Pencil,
  X,
} from "lucide-react";
import { type MouseEvent, useRef, useState } from "react";

import { archiveRecordAction } from "@/modules/groups/actions";
import { cefrLabels } from "@/modules/groups/schema";
import {
  RecordEditForm,
  RecordHistory,
  type RecordHistoryEntry,
} from "@/modules/records/components/record-edit-form";
import { useMovableDialog } from "@/modules/records/components/use-movable-dialog";

type GroupRecord = {
  id: string;
  kind: "GROUP";
  name: string;
  cefrLevel: keyof typeof cefrLabels;
  studentCount: number;
  teacherCount: number;
  locationId: string;
  locationName: string;
};

type RoomRecord = {
  id: string;
  kind: "ROOM";
  name: string;
  capacity: number | null;
  scheduleCount: number;
  locationId: string;
  locationName: string;
};

type ResourceRecord = GroupRecord | RoomRecord;

export function ResourceDirectory({
  groups,
  rooms,
  locations,
  actorRole,
  historyById,
}: {
  groups: Omit<GroupRecord, "kind">[];
  rooms: Omit<RoomRecord, "kind">[];
  locations: Array<{
    id: string;
    name: string;
    address: string | null;
    isOnline: boolean;
  }>;
  actorRole: "DIRECTOR" | "TEACHER";
  historyById: Record<string, RecordHistoryEntry[]>;
}) {
  const [selected, setSelected] = useState<ResourceRecord | null>(null);
  const [locationFilter, setLocationFilter] = useState(
    () =>
      locations.find((location) =>
        groups.some((group) => group.locationId === location.id) ||
        rooms.some((room) => room.locationId === location.id),
      )?.id ??
      locations[0]?.id ??
      "",
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const { startDrag, resetDialogPosition } = useMovableDialog(dialogRef);

  function openResource(
    resource: ResourceRecord,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    lastTriggerRef.current = event.currentTarget;
    setSelected(resource);
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }
  function closeDialog() {
    dialogRef.current?.close();
  }
  function restoreFocus() {
    resetDialogPosition();
    setSelected(null);
    lastTriggerRef.current?.focus();
  }

  return (
    <>
      <section className="resource-directory" aria-labelledby="resources-title">
        <div className="records-section-heading">
          <div>
            <span className="section-kicker">Zasoby do grafiku</span>
            <h2 id="resources-title">Grupy i sale</h2>
            <p>
              Wybierz oddział albo zobacz wszystkie. W każdej lokalizacji grupy
              i sale są rozdzielone tak samo.
            </p>
          </div>
        </div>
        <label className="location-view-select" id="lokalizacje">
          <span><MapPin aria-hidden="true" /> Widok lokalizacji</span>
          <select
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
          >
            <option value="">Wszystkie lokalizacje</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <div className="location-container-list">
          {locations
            .filter(
              (location) =>
                !locationFilter || location.id === locationFilter,
            )
            .map((location) => (
              <section className="location-resource-container" key={location.id}>
                <header>
                  <span className="record-icon record-icon-blue">
                    <MapPin aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{location.name}</h3>
                    <p>
                      {location.isOnline
                        ? "Zajęcia online"
                        : location.address || "Adres nie został jeszcze podany"}
                    </p>
                  </div>
                </header>
                <div className="resource-directory-grid">
                  <ResourceList
                    id={`grupy-${location.id}`}
                    icon={<GraduationCap aria-hidden="true" />}
                    title="Grupy"
                    resources={groups
                      .filter((group) => group.locationId === location.id)
                      .map((group) => ({ ...group, kind: "GROUP" }))}
                    onOpen={openResource}
                  />
                  <ResourceList
                    id={`sale-${location.id}`}
                    icon={<DoorOpen aria-hidden="true" />}
                    title="Sale"
                    resources={rooms
                      .filter((room) => room.locationId === location.id)
                      .map((room) => ({ ...room, kind: "ROOM" }))}
                    onOpen={openResource}
                  />
                </div>
              </section>
            ))}
        </div>
      </section>

      <dialog
        className="person-dialog resource-dialog"
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClose={restoreFocus}
        aria-labelledby="resource-dialog-title"
      >
        {selected ? (
          <div className="person-dialog-shell">
            <header
              className="person-dialog-header person-dialog-drag-handle"
              onPointerDown={startDrag}
            >
              <GripHorizontal
                className="person-dialog-grip"
                aria-label="Przeciągnij, aby przesunąć okno"
              />
              <span className="record-icon record-icon-blue">
                {selected.kind === "ROOM" ? (
                  <DoorOpen aria-hidden="true" />
                ) : (
                  <GraduationCap aria-hidden="true" />
                )}
              </span>
              <div>
                <span>{selected.kind === "ROOM" ? "Sala" : "Grupa"}</span>
                <h2 id="resource-dialog-title">{selected.name}</h2>
                <p>
                  {selected.kind === "ROOM"
                    ? `${selected.scheduleCount} zapisanych zajęć`
                    : `${selected.studentCount} uczniów · ${selected.teacherCount} wykładowców`}
                </p>
                <small className="resource-location-label">
                  <MapPin aria-hidden="true" /> {selected.locationName}
                </small>
              </div>
              <button
                className="person-dialog-close"
                type="button"
                onClick={closeDialog}
                aria-label="Zamknij kartę"
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <div className="person-dialog-body">
              <section aria-labelledby="resource-edit-heading">
                <div className="person-dialog-section-heading">
                  <h3 id="resource-edit-heading">
                    <Pencil aria-hidden="true" /> Edytuj dane
                  </h3>
                  <span>
                    {actorRole === "DIRECTOR"
                      ? "Zapis bezpośredni"
                      : "Wymaga zgody dyrektora"}
                  </span>
                </div>
                <RecordEditForm
                  key={selected.id}
                  entityType={selected.kind}
                  entityId={selected.id}
                  isDirector={actorRole === "DIRECTOR"}
                >
                  <div className="record-edit-grid">
                    <label>
                      <span>Lokalizacja</span>
                      <select
                        name="locationId"
                        defaultValue={selected.locationId}
                        required
                      >
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Nazwa</span>
                      <input
                        name="name"
                        defaultValue={selected.name}
                        required
                        minLength={2}
                        maxLength={100}
                      />
                    </label>
                    {selected.kind === "ROOM" ? (
                      <label>
                        <span>Liczba miejsc</span>
                        <input
                          name="capacity"
                          type="number"
                          defaultValue={selected.capacity ?? ""}
                          min={1}
                          max={100}
                          placeholder="Nie podano"
                        />
                      </label>
                    ) : (
                      <label>
                        <span>Poziom CEFR</span>
                        <select
                          name="cefrLevel"
                          defaultValue={selected.cefrLevel}
                        >
                          {Object.entries(cefrLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </RecordEditForm>
              </section>
              <section aria-labelledby="resource-history-heading">
                <div className="person-dialog-section-heading">
                  <h3 id="resource-history-heading">
                    <History aria-hidden="true" /> Historia zmian
                  </h3>
                  <span>Ślad zatwierdzeń i edycji</span>
                </div>
                <RecordHistory entries={historyById[selected.id] ?? []} />
              </section>
            </div>
            <footer className="person-dialog-footer">
              {actorRole === "DIRECTOR" ? (
                <details className="person-archive">
                  <summary>
                    <Archive aria-hidden="true" /> Archiwizuj kartotekę
                  </summary>
                  <div>
                    <p>
                      Rekord zniknie z aktywnej listy, ale historia pozostanie.
                    </p>
                    <form action={archiveRecordAction}>
                      <input
                        type="hidden"
                        name="recordId"
                        value={selected.id}
                      />
                      <input
                        type="hidden"
                        name="recordType"
                        value={selected.kind === "ROOM" ? "room" : "group"}
                      />
                      <button type="submit">Potwierdź archiwizację</button>
                    </form>
                  </div>
                </details>
              ) : (
                <span />
              )}
              <button
                className="button button-primary"
                type="button"
                onClick={closeDialog}
              >
                Gotowe
              </button>
            </footer>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
function ResourceList({
  id,
  icon,
  title,
  resources,
  onOpen,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  resources: ResourceRecord[];
  onOpen: (
    resource: ResourceRecord,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
}) {
  return (
    <article className="records-card resource-list-card" id={id}>
      <div className="records-card-heading">
        <span className="record-icon record-icon-blue">{icon}</span>
        <div>
          <h2>{title}</h2>
        </div>
        <span className="records-count">{resources.length}</span>
      </div>
      {resources.length === 0 ? (
        <div className="records-empty">
          <strong>Lista jest jeszcze pusta</strong>
          <p>Dyrektor może dodać pierwszy rekord przyciskiem u góry.</p>
        </div>
      ) : (
        <ul>
          {resources.map((resource) => (
            <li key={resource.id}>
              <button
                className="resource-open-button"
                type="button"
                onClick={(event) => onOpen(resource, event)}
              >
                <span>
                  <strong>{resource.name}</strong>
                  <small>
                    {resource.kind === "ROOM"
                      ? `${resource.capacity ?? "—"} miejsc · ${resource.scheduleCount} zajęć`
                      : `${cefrLabels[resource.cefrLevel]} · ${resource.studentCount} uczniów · ${resource.teacherCount} wykładowców`}
                  </small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
