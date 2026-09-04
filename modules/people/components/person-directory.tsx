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
  RotateCcw,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { archiveRecordAction, restoreRecordAction } from "@/modules/groups/actions";
import { recordRoleLabels } from "@/modules/people/schema";
import {
  RecordEditForm,
  RecordHistory,
  type RecordHistoryEntry,
} from "@/modules/records/components/record-edit-form";
import { useMovableDialog } from "@/modules/records/components/use-movable-dialog";
import {
  RelationshipEditor,
  type RelationshipOption,
} from "@/modules/records/components/relationship-editor";
import { StudentAvailabilityEditor } from "@/modules/records/components/student-availability-editor";
import { openPersonConversationAction } from "@/modules/messaging/actions";
import { PasswordResetButton } from "@/modules/identity/components/password-reset-button";

export type PersonDirectoryRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  externalId: string | null;
  role: "TEACHER" | "PARENT" | "STUDENT";
  status: "INVITED" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  isArchived: boolean;
  hasAccount: boolean;
  relationLabel: string;
  relations: string[];
  childIds: string[];
  parentIds: string[];
  groupIds: string[];
  derivedTeachers: Array<{ id: string; name: string; groupName: string }>;
  availabilityWindows: Array<{ weekday: number; startMinute: number; endMinute: number }>;
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
  isSystemOwner = false,
  historyById,
  relationOptions,
}: {
  people: PersonDirectoryRecord[];
  actorRole: "DIRECTOR" | "TEACHER";
  isSystemOwner?: boolean;
  historyById: Record<string, RecordHistoryEntry[]>;
  relationOptions: {
    students: RelationshipOption[];
    parents: RelationshipOption[];
    groups: RelationshipOption[];
  };
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<(typeof filters)[number]["value"]>("ALL");
  const [visibleCount, setVisibleCount] = useState(12);
  const [selected, setSelected] = useState<PersonDirectoryRecord | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { startDrag, resetDialogPosition } = useMovableDialog(dialogRef);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!selected) return;
    const refreshed = people.find((person) => person.id === selected.id);
    if (refreshed && refreshed !== selected) {
      const timer = window.setTimeout(() => setSelected(refreshed), 0);
      return () => window.clearTimeout(timer);
    }
  }, [people, selected]);
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
              onClick={() => {
                setRole(filter.value);
                setVisibleCount(12);
              }}
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
          {filteredPeople.slice(0, visibleCount).map((person) => (
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
      {filteredPeople.length > visibleCount ? (
        <button
          className="person-show-more"
          type="button"
          onClick={() => setVisibleCount((count) => count + 12)}
        >
          Pokaż kolejne osoby ({filteredPeople.length - visibleCount})
        </button>
      ) : null}

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
                onPointerDown={(event) => event.stopPropagation()}
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

              {selected.isArchived ? (
                <section className="records-archive-notice" aria-label="Kartoteka archiwalna">
                  <Archive aria-hidden="true" />
                  <div>
                    <strong>Ta kartoteka jest w archiwum</strong>
                    <p>Możesz bezpiecznie przeglądać jej dane i historię. Przywróć ją, aby ponownie edytować powiązania i korzystać z konta.</p>
                  </div>
                </section>
              ) : (
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
                <div className="relationship-editor-stack">
                  {selected.role === "PARENT" ? (
                    <RelationshipEditor
                      key={`${selected.id}-children`}
                      entityId={selected.id}
                      relationKind="PARENT_CHILDREN"
                      title="Dzieci pod opieką"
                      description="Wybierz dzieci, których plan, umowy i płatności ma widzieć ten rodzic."
                      options={relationOptions.students}
                      selectedIds={selected.childIds}
                      actorRole={actorRole}
                    />
                  ) : null}
                  {selected.role === "STUDENT" ? (
                    <>
                      <RelationshipEditor
                        key={`${selected.id}-parents`}
                        entityId={selected.id}
                        relationKind="STUDENT_PARENTS"
                        title="Rodzice i opiekunowie"
                        description="Te osoby otrzymują dostęp do spraw ucznia."
                        options={relationOptions.parents}
                        selectedIds={selected.parentIds}
                        actorRole={actorRole}
                      />
                      <RelationshipEditor
                        key={`${selected.id}-groups`}
                        entityId={selected.id}
                        relationKind="STUDENT_GROUPS"
                        title="Grupy ucznia"
                        description="Wykładowca i sala wynikają z grupy oraz konkretnej lekcji, dzięki czemu grafik nie ma sprzecznych przypisań."
                        options={relationOptions.groups}
                        selectedIds={selected.groupIds}
                        actorRole={actorRole}
                      />
                      <DerivedTeachers teachers={selected.derivedTeachers} />
                      <StudentAvailabilityEditor
                        key={`${selected.id}-availability`}
                        studentId={selected.id}
                        windows={selected.availabilityWindows}
                        actorRole={actorRole}
                      />
                    </>
                  ) : null}
                  {selected.role === "TEACHER" ? (
                    <RelationshipEditor
                      key={`${selected.id}-groups`}
                      entityId={selected.id}
                      relationKind="TEACHER_GROUPS"
                      title="Prowadzone grupy"
                      description="Przypisz grupy. Konkretne zajęcia nadal mogą wskazać innego dostępnego prowadzącego."
                      options={relationOptions.groups}
                      selectedIds={selected.groupIds}
                      actorRole={actorRole}
                    />
                  ) : null}
                </div>
              </section>
              )}

              {!selected.isArchived ? (
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
              ) : null}

              {!selected.isArchived ? (
              <section aria-labelledby="person-modules-heading">
                <div className="person-dialog-section-heading">
                  <h3 id="person-modules-heading">Sprawy tej osoby</h3>
                  <span>Skróty do powiązanych informacji</span>
                </div>
                <div className="person-module-grid">
                  {actorRole === "DIRECTOR" ? (
                    <form action={openPersonConversationAction}>
                      <input type="hidden" name="personId" value={selected.id} />
                      <button type="submit" className="person-module-action">
                        <MessageCircleMore aria-hidden="true" />
                        <span><strong>Wiadomości</strong><small>Otwórz rozmowę z tą osobą</small></span>
                        <ChevronRight aria-hidden="true" />
                      </button>
                    </form>
                  ) : null}
                  {actorRole === "DIRECTOR" && selected.hasAccount && selected.email ? (
                    <PasswordResetButton userId={selected.id} />
                  ) : null}
                  {selected.role === "PARENT" ? (
                    <FutureModule
                      href={`/panel/platnosci?rodzic=${selected.id}`}
                      icon={<WalletCards aria-hidden="true" />}
                      title="Płatności"
                      status="Otwórz rozliczenia"
                    />
                  ) : null}
                  {selected.role === "PARENT" ? (
                    <FutureModule
                      href={`/panel/umowy?rodzic=${selected.id}`}
                      icon={<IdCard aria-hidden="true" />}
                      title="Umowy"
                      status="Otwórz dokumenty"
                    />
                  ) : null}
                  {selected.role === "STUDENT" ? (
                    <FutureModule
                      href={`/panel/postepy?uczen=${selected.id}`}
                      icon={<TrendingUp aria-hidden="true" />}
                      title="Postępy"
                      status="Otwórz postępy ucznia"
                    />
                  ) : null}
                </div>
              </section>
              ) : null}

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
              {isSystemOwner && selected.isArchived ? (
                <form action={restoreRecordAction}>
                  <input type="hidden" name="recordId" value={selected.id} />
                  <input type="hidden" name="recordType" value="person" />
                  <button className="button button-secondary" type="submit">
                    <RotateCcw aria-hidden="true" /> Przywróć kartotekę
                  </button>
                </form>
              ) : actorRole === "DIRECTOR" ? (
                <details className="person-archive">
                <summary>
                  <Archive aria-hidden="true" /> {isSystemOwner ? "Usuń z aktywnych kartotek" : "Archiwizuj kartotekę"}
                </summary>
                <div>
                  <p>
                    Kartoteka zniknie z aktywnej listy, ale jej historia
                    pozostanie w systemie. Dzięki temu umowy, płatności i audyt nie utracą spójności.
                  </p>
                  <form action={archiveRecordAction}>
                    <input type="hidden" name="recordId" value={selected.id} />
                    <input type="hidden" name="recordType" value="person" />
                    <button type="submit">{isSystemOwner ? "Potwierdź usunięcie z aktywnych" : "Potwierdź archiwizację"}</button>
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

function DerivedTeachers({
  teachers,
}: {
  teachers: Array<{ id: string; name: string; groupName: string }>;
}) {
  const unique = Array.from(
    new Map(teachers.map((teacher) => [`${teacher.id}:${teacher.groupName}`, teacher])).values(),
  );
  return (
    <div className="derived-relationship-note">
      <strong>Wykładowcy wynikający z grup</strong>
      {unique.length > 0 ? (
        <ul>
          {unique.map((teacher) => (
            <li key={`${teacher.id}:${teacher.groupName}`}>
              {teacher.name} <small>· {teacher.groupName}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p>Najpierw przypisz ucznia do grupy, a potem prowadzących w karcie tej grupy.</p>
      )}
    </div>
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
  status,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  status: string;
}) {
  return (
    <Link href={href}>
      {icon}
      <span>
        <strong>{title}</strong>
        <small>{status}</small>
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
