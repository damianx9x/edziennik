"use client";

import {
  Archive,
  ChevronRight,
  GraduationCap,
  GripHorizontal,
  History,
  IdCard,
  Mail,
  MessageCircleMore,
  Phone,
  Search,
  TrendingUp,
  Pencil,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  type MouseEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import { archiveRecordAction } from "@/modules/groups/actions";
import { recordRoleLabels } from "@/modules/people/schema";
import {
  RecordEditForm,
  RecordHistory,
  type RecordHistoryEntry,
} from "@/modules/records/components/record-edit-form";
import { useMovableDialog } from "@/modules/records/components/use-movable-dialog";

export type PersonDirectoryRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  externalId: string | null;
  role: "TEACHER" | "PARENT" | "STUDENT";
  status: "INVITED" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  hasAccount: boolean;
  relationLabel: string;
  relations: string[];
};

const filters = [
  { value: "ALL", label: "Wszyscy" },
  { value: "STUDENT", label: "Uczniowie" },
  { value: "PARENT", label: "Rodzice" },
  { value: "TEACHER", label: "Wykładowcy" },
] as const;

export function PersonDirectory({
  people,
  actorRole,
  historyById,
}: {
  people: PersonDirectoryRecord[];
  actorRole: "DIRECTOR" | "TEACHER";
  historyById: Record<string, RecordHistoryEntry[]>;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<(typeof filters)[number]["value"]>("ALL");
  const [selected, setSelected] = useState<PersonDirectoryRecord | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { startDrag, resetDialogPosition } = useMovableDialog(dialogRef);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const filteredPeople = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pl-PL");
    return people.filter((person) => {
      if (role !== "ALL" && person.role !== role) return false;
      if (!needle) return true;
      return [person.name, person.email, person.phone, person.externalId]
        .filter(Boolean)
        .some((value) =>
          value!.toLocaleLowerCase("pl-PL").includes(needle),
        );
    });
  }, [people, query, role]);

  function openPerson(
    person: PersonDirectoryRecord,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    lastTriggerRef.current = event.currentTarget;
    setSelected(person);
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
    <section
      className="records-card person-directory"
      aria-labelledby="people-directory-title"
    >
      <div className="records-card-heading person-directory-heading">
        <span className="record-icon record-icon-blue">
          <Users aria-hidden="true" />
        </span>
        <div>
          <span className="section-kicker">Najczęściej używane</span>
          <h2 id="people-directory-title">Osoby</h2>
          <p>Wyszukaj osobę i dotknij jej karty, aby zobaczyć komplet danych.</p>
        </div>
        <span className="records-count">{people.length}</span>
      </div>

      <div className="person-directory-tools">
        <label className="person-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Szukaj osoby</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Imię, e-mail, telefon lub identyfikator"
          />
        </label>
        <div className="person-role-filters" aria-label="Filtruj według roli">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={role === filter.value}
              onClick={() => setRole(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {filteredPeople.length === 0 ? (
        <div className="records-empty">
          <strong>Nie znaleziono osoby</strong>
          <p>Zmień wyszukiwaną frazę albo wybierz inny filtr.</p>
        </div>
      ) : (
        <div className="person-card-grid">
          {filteredPeople.map((person) => (
            <button
              className="person-card"
              type="button"
              key={person.id}
              onClick={(event) => openPerson(person, event)}
              aria-label={`Otwórz kartę: ${person.name}`}
            >
              <PersonAvatar person={person} />
              <span className="person-card-copy">
                <strong>{person.name}</strong>
                <small>{recordRoleLabels[person.role]}</small>
                <span>
                  {person.relationLabel}
                  {person.email ? ` · ${person.email}` : ""}
                </span>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <dialog
        className="person-dialog"
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          closeDialog();
        }}
        onClose={restoreFocus}
        aria-labelledby="person-dialog-title"
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
              <PersonAvatar person={selected} large />
              <div>
                <span>{recordRoleLabels[selected.role]}</span>
                <h2 id="person-dialog-title">{selected.name}</h2>
                <p>
                  {accountStatusLabel(selected.status, selected.hasAccount)}
                </p>
              </div>
              <button
                className="person-dialog-close"
                type="button"
                onClick={closeDialog}
                aria-label="Zamknij kartę osoby"
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <div className="person-dialog-body">
              <section aria-labelledby="person-contact-heading">
                <div className="person-dialog-section-heading">
                  <h3 id="person-contact-heading">Dane kontaktowe</h3>
                  <span>Widoczne tylko dla szkoły</span>
                </div>
                <dl className="person-contact-grid">
                  <ContactItem
                    icon={<UserRound aria-hidden="true" />}
                    label="Imię i nazwisko"
                    value={selected.name}
                  />
                  <ContactItem
                    icon={<Mail aria-hidden="true" />}
                    label="Adres e-mail"
                    value={selected.email ?? "Nie podano"}
                    href={
                      selected.email ? `mailto:${selected.email}` : undefined
                    }
                  />
                  <ContactItem
                    icon={<Phone aria-hidden="true" />}
                    label="Numer telefonu"
                    value={selected.phone ?? "Nie podano"}
                    href={
                      selected.phone
                        ? `tel:${selected.phone.replaceAll(" ", "")}`
                        : undefined
                    }
                  />
                  <ContactItem
                    icon={<IdCard aria-hidden="true" />}
                    label="Identyfikator szkolny"
                    value={selected.externalId ?? "Nie nadano"}
                  />
                </dl>
              </section>

              <section aria-labelledby="person-relations-heading">
                <div className="person-dialog-section-heading">
                  <h3 id="person-relations-heading">Powiązania w szkole</h3>
                  <span>{selected.relationLabel}</span>
                </div>
                {selected.relations.length > 0 ? (
                  <ul className="person-relation-list">
                    {selected.relations.map((relation) => (
                      <li key={relation}>
                        {selected.role === "STUDENT" ? (
                          <GraduationCap aria-hidden="true" />
                        ) : (
                          <Users aria-hidden="true" />
                        )}
                        {relation}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="person-dialog-empty">
                    Brak aktywnych powiązań. Dodasz je z kartoteki lub importu.
                  </p>
                )}
              </section>

              <section aria-labelledby="person-edit-heading">
                <div className="person-dialog-section-heading">
                  <h3 id="person-edit-heading">
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
                  entityType="USER"
                  entityId={selected.id}
                  isDirector={actorRole === "DIRECTOR"}
                >
                  <div className="record-edit-grid">
                    <label>
                      <span>Imię i nazwisko</span>
                      <input
                        name="name"
                        defaultValue={selected.name}
                        required
                        minLength={2}
                        maxLength={120}
                      />
                    </label>
                    <label>
                      <span>Adres e-mail</span>
                      <input
                        name="email"
                        type="email"
                        defaultValue={selected.email ?? ""}
                        placeholder="Nie podano"
                      />
                    </label>
                    <label>
                      <span>Telefon</span>
                      <input
                        name="phone"
                        type="tel"
                        defaultValue={selected.phone ?? ""}
                        maxLength={30}
                        placeholder="Nie podano"
                      />
                    </label>
                    <label>
                      <span>Identyfikator szkolny</span>
                      <input
                        name="externalId"
                        defaultValue={selected.externalId ?? ""}
                        maxLength={80}
                        placeholder="Nie nadano"
                      />
                    </label>
                  </div>
                </RecordEditForm>
              </section>

              <section aria-labelledby="person-modules-heading">
                <div className="person-dialog-section-heading">
                  <h3 id="person-modules-heading">Sprawy tej osoby</h3>
                  <span>Jedno miejsce, gdy kolejne moduły będą gotowe</span>
                </div>
                <div className="person-module-grid">
                  <FutureModule
                    href="/panel/szkola#wiadomosci"
                    icon={<MessageCircleMore aria-hidden="true" />}
                    title="Wiadomości"
                    stage="Etap 5"
                  />
                  <FutureModule
                    href="/panel/szkola#platnosci"
                    icon={<WalletCards aria-hidden="true" />}
                    title="Płatności"
                    stage="Etap 4"
                  />
                  <FutureModule
                    href="/panel/szkola#postepy"
                    icon={<TrendingUp aria-hidden="true" />}
                    title="Postępy"
                    stage="Etap 6"
                  />
                </div>
              </section>

              <section aria-labelledby="person-history-heading">
                <div className="person-dialog-section-heading">
                  <h3 id="person-history-heading">
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
                    Kartoteka zniknie z aktywnej listy, ale jej historia
                    pozostanie w systemie.
                  </p>
                  <form action={archiveRecordAction}>
                    <input type="hidden" name="recordId" value={selected.id} />
                    <input type="hidden" name="recordType" value="person" />
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
    </section>
  );
}

function PersonAvatar({
  person,
  large = false,
}: {
  person: PersonDirectoryRecord;
  large?: boolean;
}) {
  const initials = person.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("")
    .toLocaleUpperCase("pl-PL");
  return (
    <span
      className={`person-avatar person-avatar-${person.role.toLocaleLowerCase()}${large ? " person-avatar-large" : ""}`}
      aria-hidden="true"
    >
      {initials || "K"}
    </span>
  );
}

function ContactItem({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div>
      <dt>
        {icon}
        {label}
      </dt>
      <dd>{href ? <a href={href}>{value}</a> : value}</dd>
    </div>
  );
}

function FutureModule({
  href,
  icon,
  title,
  stage,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  stage: string;
}) {
  return (
    <Link href={href}>
      {icon}
      <span>
        <strong>{title}</strong>
        <small>{stage} · przygotowane miejsce</small>
      </span>
      <ChevronRight aria-hidden="true" />
    </Link>
  );
}

function accountStatusLabel(
  status: PersonDirectoryRecord["status"],
  hasAccount: boolean,
): string {
  if (!hasAccount) return "Kartoteka bez aktywnego logowania";
  return (
    {
      ACTIVE: "Konto aktywne",
      INVITED: "Oczekuje na aktywację",
      SUSPENDED: "Konto zawieszone",
      ARCHIVED: "Konto zarchiwizowane",
    }[status] ?? "Status konta nieznany"
  );
}
