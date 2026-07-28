"use client";

import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  DoorOpen,
  GraduationCap,
  Lock,
  MapPin,
  Sparkles,
  School,
  UserRoundCheck,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  applyScheduleGenerationAction,
  generateScheduleAction,
  saveSchedulingRequirementAction,
  saveTeacherAvailabilityAction,
} from "../assistant-actions";
import type {
  ScheduleActionState,
  ScheduleGenerationView,
  ScheduleLocation,
  ScheduleRequirementView,
  ScheduleResource,
  TeacherAvailabilityView,
} from "../types";

const initialState: ScheduleActionState = { status: "idle", message: "" };
const weekdayLabels = [
  { value: 1, short: "Pon", full: "Poniedziałek" },
  { value: 2, short: "Wt", full: "Wtorek" },
  { value: 3, short: "Śr", full: "Środa" },
  { value: 4, short: "Czw", full: "Czwartek" },
  { value: 5, short: "Pt", full: "Piątek" },
  { value: 6, short: "Sob", full: "Sobota" },
];

function timeValue(minutes: number | null) {
  if (minutes === null) return "";
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}`;
}

function statusMessage(errorCode?: string, successCode?: string) {
  if (successCode === "opublikowano") {
    return {
      kind: "success",
      text: "Grafik został opublikowany. Wszyscy zobaczą aktualny plan.",
    };
  }
  if (errorCode === "kolizja") {
    return {
      kind: "error",
      text: "Od utworzenia propozycji grafik się zmienił. Wygeneruj świeżą wersję.",
    };
  }
  if (errorCode === "propozycja-niepelna") {
    return {
      kind: "error",
      text: "Najpierw rozwiąż brakujące lekcje. Niepełna propozycja nie została opublikowana.",
    };
  }
  if (errorCode === "zakres") {
    return {
      kind: "error",
      text: "Sprawdź zakres dat. Możesz ułożyć jednorazowo maksymalnie 8 tygodni.",
    };
  }
  if (errorCode === "brak-zakresu") {
    return {
      kind: "error",
      text: "Dla tego wyboru nie ma skonfigurowanych grup. Zmień zakres albo uzupełnij potrzeby grup.",
    };
  }
  if (errorCode) {
    return {
      kind: "error",
      text: "Ta propozycja nie jest już dostępna. Wygeneruj nową.",
    };
  }
  return null;
}

export function ScheduleAssistantPanel({
  weekStart,
  weekLabel,
  groups,
  locations,
  rooms,
  teachers,
  requirements,
  availability,
  generation,
  errorCode,
  successCode,
}: {
  weekStart: string;
  weekLabel: string;
  groups: ScheduleResource[];
  locations: ScheduleLocation[];
  rooms: ScheduleResource[];
  teachers: ScheduleResource[];
  requirements: ScheduleRequirementView[];
  availability: TeacherAvailabilityView[];
  generation: ScheduleGenerationView | null;
  errorCode?: string;
  successCode?: string;
}) {
  const configuredGroups = requirements.filter(
    (requirement) => requirement.configured,
  ).length;
  const configuredTeachers = availability.filter(
    (entry) => entry.configured,
  ).length;
  const ready =
    groups.length > 0 &&
    rooms.length > 0 &&
    teachers.length > 0 &&
    configuredGroups === groups.length;
  const pageMessage = statusMessage(errorCode, successCode);

  return (
    <div className="schedule-assistant">
      {pageMessage ? (
        <div
          className={`assistant-page-message ${pageMessage.kind}`}
          role="status"
        >
          {pageMessage.kind === "success" ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <AlertCircle aria-hidden="true" />
          )}
          {pageMessage.text}
        </div>
      ) : null}

      <section className="assistant-intro">
        <div className="assistant-intro-icon">
          <WandSparkles aria-hidden="true" />
        </div>
        <div>
          <span className="section-kicker">Asystent układania grafiku</span>
          <h2>Najpierw dane, potem bezpieczna propozycja</h2>
          <p>
            Asystent nie publikuje sam. Sprawdza salę, wykładowcę, grupę i
            wspólnych uczniów, a gotowy szkic pokazuje do akceptacji.
          </p>
        </div>
        <div className="assistant-week">
          <Clock3 aria-hidden="true" />
          <span>
            <small>Układany tydzień</small>
            <strong>{weekLabel}</strong>
          </span>
        </div>
      </section>

      <section className="assistant-readiness" aria-label="Gotowość danych">
        <div>
          <span className={configuredGroups === groups.length ? "done" : ""}>
            {configuredGroups === groups.length ? (
              <Check aria-hidden="true" />
            ) : (
              <Users aria-hidden="true" />
            )}
          </span>
          <p>
            <strong>
              {configuredGroups}/{groups.length} grup
            </strong>
            <small>ma ustaloną liczbę lekcji i zasoby</small>
          </p>
        </div>
        <div>
          <span className={rooms.length > 0 ? "done" : ""}>
            {rooms.length > 0 ? (
              <Check aria-hidden="true" />
            ) : (
              <DoorOpen aria-hidden="true" />
            )}
          </span>
          <p>
            <strong>{rooms.length} aktywnych sal</strong>
            <small>pojemność jest sprawdzana automatycznie</small>
          </p>
        </div>
        <div>
          <span className={teachers.length > 0 ? "done" : ""}>
            {teachers.length > 0 ? (
              <Check aria-hidden="true" />
            ) : (
              <UserRoundCheck aria-hidden="true" />
            )}
          </span>
          <p>
            <strong>
              {configuredTeachers}/{teachers.length} dostępności
            </strong>
            <small>brak ustawienia oznacza pełne godziny szkoły</small>
          </p>
        </div>
      </section>

      <div className="assistant-setup-grid">
        <section className="assistant-setup-card">
          <header>
            <span className="assistant-step">1</span>
            <div>
              <h2>Ustaw potrzeby grup</h2>
              <p>Każdą grupę konfigurujesz raz, potem tylko poprawiasz.</p>
            </div>
          </header>
          <div className="assistant-config-list">
            {requirements.length ? (
              requirements.map((requirement) => (
                <RequirementForm
                  key={requirement.groupId}
                  requirement={requirement}
                  rooms={rooms}
                  teachers={teachers}
                />
              ))
            ) : (
              <div className="assistant-empty">
                <GraduationCap aria-hidden="true" />
                <p>
                  Najpierw dodaj grupy w Kartotekach. Potem wróć tutaj.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="assistant-setup-card">
          <header>
            <span className="assistant-step">2</span>
            <div>
              <h2>Dostępność wykładowców</h2>
              <p>Opcjonalnie zawęź dni i godziny każdej osoby.</p>
            </div>
          </header>
          <div className="assistant-config-list">
            {availability.length ? (
              availability.map((entry) => (
                <AvailabilityForm key={entry.teacherId} entry={entry} />
              ))
            ) : (
              <div className="assistant-empty">
                <UserRoundCheck aria-hidden="true" />
                <p>Dodaj aktywnego wykładowcę, aby ustawić dostępność.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="assistant-generate-card">
        <div>
          <span className="assistant-step">3</span>
          <div>
            <span className="section-kicker">Bez ryzyka</span>
            <h2>Wygeneruj propozycję</h2>
            <p>
              Istniejące lekcje pozostaną na miejscu. Asystent dołoży tylko
              brakujące i nigdy nie zapisze kolizji.
            </p>
          </div>
        </div>
        <GenerationControls
          weekStart={weekStart}
          groups={groups}
          locations={locations}
          rooms={rooms}
          teachers={teachers}
          requirements={requirements}
          ready={ready}
        />
      </section>

      {generation ? (
        <GenerationPreview key={generation.id} generation={generation} />
      ) : (
        <section className="assistant-no-preview">
          <Lock aria-hidden="true" />
          <div>
            <h2>Nic nie zostanie opublikowane bez Twojej decyzji</h2>
            <p>
              Po wygenerowaniu zobaczysz każdą lekcję, wykładowcę i salę.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

type GenerationScope = "SCHOOL" | "LOCATION" | "GROUP" | "TEACHER" | "ROOM";

function shiftDateKey(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function GenerationControls({
  weekStart,
  groups,
  locations,
  rooms,
  teachers,
  requirements,
  ready,
}: {
  weekStart: string;
  groups: ScheduleResource[];
  locations: ScheduleLocation[];
  rooms: ScheduleResource[];
  teachers: ScheduleResource[];
  requirements: ScheduleRequirementView[];
  ready: boolean;
}) {
  const [scope, setScope] = useState<GenerationScope>("SCHOOL");
  const [targetId, setTargetId] = useState("");
  const resources =
    scope === "LOCATION"
      ? locations
      : scope === "GROUP"
        ? groups
        : scope === "TEACHER"
          ? teachers
          : rooms;
  const scopedReady =
    scope === "SCHOOL"
      ? ready
      : Boolean(targetId) &&
        requirements.some(
          (requirement) =>
            requirement.configured &&
            (scope === "LOCATION"
              ? requirement.locationId === targetId
              : scope === "GROUP"
              ? requirement.groupId === targetId
              : scope === "TEACHER"
                ? requirement.teacherId === targetId
                : requirement.preferredRoomId === targetId),
        );
  const scopeOptions: Array<{
    value: GenerationScope;
    label: string;
    copy: string;
    icon: typeof School;
  }> = [
    {
      value: "SCHOOL",
      label: "Cała szkoła",
      copy: "Wszystkie skonfigurowane grupy",
      icon: School,
    },
    {
      value: "LOCATION",
      label: "Lokalizacja",
      copy: "Wszystkie grupy w jednym oddziale",
      icon: MapPin,
    },
    {
      value: "GROUP",
      label: "Jedna grupa",
      copy: "Tylko wybrana grupa",
      icon: Users,
    },
    {
      value: "TEACHER",
      label: "Wykładowca",
      copy: "Grupy prowadzone przez tę osobę",
      icon: UserRoundCheck,
    },
    {
      value: "ROOM",
      label: "Sala",
      copy: "Grupy preferujące tę salę",
      icon: Building2,
    },
  ];

  return (
    <form action={generateScheduleAction} className="assistant-generate-form">
      <fieldset className="assistant-scope-fieldset">
        <legend>Co chcesz ułożyć?</legend>
        <div className="assistant-scope-options">
          {scopeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <label
                key={option.value}
                className={scope === option.value ? "active" : undefined}
              >
                <input
                  type="radio"
                  name="scope"
                  value={option.value}
                  checked={scope === option.value}
                  onChange={() => {
                    setScope(option.value);
                    setTargetId("");
                  }}
                />
                <Icon aria-hidden="true" />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.copy}</small>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {scope !== "SCHOOL" ? (
        <label className="assistant-target-field">
          {scope === "LOCATION"
            ? "Wybierz lokalizację"
            : scope === "GROUP"
            ? "Wybierz grupę"
            : scope === "TEACHER"
              ? "Wybierz wykładowcę"
              : "Wybierz salę"}
          <select
            name="targetId"
            required
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
          >
            <option value="" disabled>
              Wybierz z listy
            </option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name}
              </option>
            ))}
          </select>
          {scope === "ROOM" ? (
            <small>
              Asystent ułoży w niej grupy, które mają tę salę ustawioną jako
              preferowaną.
            </small>
          ) : null}
          {scope === "LOCATION" ? (
            <small>
              Asystent użyje tylko grup i sal należących do wybranej
              lokalizacji.
            </small>
          ) : null}
        </label>
      ) : (
        <input type="hidden" name="targetId" value="" />
      )}

      <fieldset className="assistant-range-fieldset">
        <legend>
          <CalendarDays aria-hidden="true" /> Na jaki okres?
        </legend>
        <div>
          <label>
            Od
            <input type="date" name="rangeStart" defaultValue={weekStart} required />
          </label>
          <span aria-hidden="true">→</span>
          <label>
            Do
            <input
              type="date"
              name="rangeEnd"
              defaultValue={shiftDateKey(weekStart, 5)}
              required
            />
          </label>
        </div>
        <small>Maksymalnie 8 tygodni w jednym podglądzie.</small>
      </fieldset>

      <GenerateButton ready={scopedReady} />
    </form>
  );
}

function GenerateButton({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="button button-primary assistant-generate-button"
      type="submit"
      disabled={!ready || pending}
    >
      <Sparkles aria-hidden="true" />
      {pending
        ? "Układam bez kolizji…"
        : ready
          ? "Ułóż i pokaż podgląd"
          : "Najpierw uzupełnij grupy"}
    </button>
  );
}

function RequirementForm({
  requirement,
  rooms,
  teachers,
}: {
  requirement: ScheduleRequirementView;
  rooms: ScheduleResource[];
  teachers: ScheduleResource[];
}) {
  const [state, action, pending] = useActionState(
    saveSchedulingRequirementAction,
    initialState,
  );
  return (
    <details className="assistant-config-item">
      <summary>
        <span className={requirement.configured ? "done" : ""}>
          {requirement.configured ? (
            <Check aria-hidden="true" />
          ) : (
            <Users aria-hidden="true" />
          )}
        </span>
        <div>
          <strong>{requirement.groupName}</strong>
          <small>
            {requirement.studentCount}{" "}
            {requirement.studentCount === 1 ? "uczeń" : "uczniów"} ·{" "}
            {requirement.lessonsPerWeek}×{requirement.durationMinutes} min
          </small>
        </div>
        <ArrowRight aria-hidden="true" />
      </summary>
      <form action={action} className="assistant-config-form">
        <input type="hidden" name="groupId" value={requirement.groupId} />
        <div className="assistant-form-grid">
          <label>
            Wykładowca
            <select
              name="teacherId"
              defaultValue={requirement.teacherId ?? ""}
              required
            >
              <option value="" disabled>
                Wybierz osobę
              </option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Preferowana sala
            <select
              name="preferredRoomId"
              defaultValue={requirement.preferredRoomId ?? ""}
              required
            >
              <option value="" disabled>
                Wybierz salę
              </option>
              {rooms
                .filter((room) => room.locationId === requirement.locationId)
                .map((room) => (
                <option
                  key={room.id}
                  value={room.id}
                  disabled={
                    room.capacity !== null &&
                    room.capacity !== undefined &&
                    room.capacity < requirement.studentCount
                  }
                >
                  {room.name}
                  {room.capacity
                    ? ` · ${room.capacity} miejsc`
                    : " · bez limitu"}
                </option>
                ))}
            </select>
          </label>
          <label>
            Lekcji w tygodniu
            <select
              name="lessonsPerWeek"
              defaultValue={requirement.lessonsPerWeek}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Długość lekcji
            <select
              name="durationMinutes"
              defaultValue={requirement.durationMinutes}
            >
              {[30, 60, 90, 120].map((value) => (
                <option key={value} value={value}>
                  {value} minut
                </option>
              ))}
            </select>
          </label>
          <label>
            Najwcześniej
            <input
              type="time"
              name="earliestStart"
              step="1800"
              defaultValue={timeValue(requirement.earliestStartMinute)}
              required
            />
          </label>
          <label>
            Najpóźniej do
            <input
              type="time"
              name="latestEnd"
              step="1800"
              defaultValue={timeValue(requirement.latestEndMinute)}
              required
            />
          </label>
          <label>
            Najlepsza godzina
            <input
              type="time"
              name="preferredStart"
              step="1800"
              defaultValue={timeValue(requirement.preferredStartMinute)}
            />
          </label>
          <label>
            Najlepszy dzień
            <select
              name="preferredWeekdays"
              defaultValue={requirement.preferredWeekdays[0] ?? ""}
            >
              <option value="">Bez preferencji</option>
              {weekdayLabels.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.full}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="assistant-days">
          <legend>Możliwe dni</legend>
          <div>
            {weekdayLabels.map((day) => (
              <label key={day.value}>
                <input
                  type="checkbox"
                  name="allowedWeekdays"
                  value={day.value}
                  defaultChecked={requirement.allowedWeekdays.includes(
                    day.value,
                  )}
                />
                <span>{day.short}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {state.message ? (
          <p
            className={`assistant-form-message ${state.status}`}
            role="status"
          >
            {state.message}
          </p>
        ) : null}
        <button className="button button-secondary" type="submit" disabled={pending}>
          {pending ? "Zapisuję…" : "Zapisz wymagania grupy"}
        </button>
      </form>
    </details>
  );
}

function AvailabilityForm({ entry }: { entry: TeacherAvailabilityView }) {
  const [state, action, pending] = useActionState(
    saveTeacherAvailabilityAction,
    initialState,
  );
  return (
    <details className="assistant-config-item">
      <summary>
        <span className={entry.configured ? "done" : ""}>
          {entry.configured ? (
            <Check aria-hidden="true" />
          ) : (
            <UserRoundCheck aria-hidden="true" />
          )}
        </span>
        <div>
          <strong>{entry.teacherName}</strong>
          <small>
            {entry.configured
              ? `${entry.weekdays.length} dni · ${timeValue(
                  entry.startMinute,
                )}–${timeValue(entry.endMinute)}`
              : "Domyślnie: wszystkie dni 13:00–21:00"}
          </small>
        </div>
        <ArrowRight aria-hidden="true" />
      </summary>
      <form action={action} className="assistant-config-form">
        <input type="hidden" name="teacherId" value={entry.teacherId} />
        <fieldset className="assistant-days">
          <legend>Dni dostępności</legend>
          <div>
            {weekdayLabels.map((day) => (
              <label key={day.value}>
                <input
                  type="checkbox"
                  name="weekdays"
                  value={day.value}
                  defaultChecked={
                    entry.configured
                      ? entry.weekdays.includes(day.value)
                      : day.value <= 5
                  }
                />
                <span>{day.short}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="assistant-form-grid">
          <label>
            Od
            <input
              type="time"
              name="startTime"
              step="1800"
              defaultValue={timeValue(entry.startMinute)}
              required
            />
          </label>
          <label>
            Do
            <input
              type="time"
              name="endTime"
              step="1800"
              defaultValue={timeValue(entry.endMinute)}
              required
            />
          </label>
        </div>
        {state.message ? (
          <p
            className={`assistant-form-message ${state.status}`}
            role="status"
          >
            {state.message}
          </p>
        ) : null}
        <button className="button button-secondary" type="submit" disabled={pending}>
          {pending ? "Zapisuję…" : "Zapisz dostępność"}
        </button>
      </form>
    </details>
  );
}

function GenerationPreview({
  generation,
}: {
  generation: ScheduleGenerationView;
}) {
  const complete = generation.hardViolations.length === 0;
  const nothingToAdd = complete && generation.proposals.length === 0;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <>
      <section className="assistant-preview-launch" aria-label="Gotowy podgląd">
        <div className={`assistant-preview-status ${complete ? "done" : "warning"}`}>
          {complete ? <CheckCircle2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
        </div>
        <div>
          <strong>Podgląd propozycji jest gotowy</strong>
          <span>
            {generation.scopeLabel} · {generation.rangeLabel}
          </span>
        </div>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => setIsOpen(true)}
        >
          Otwórz podgląd
        </button>
      </section>

      <dialog
        ref={dialogRef}
        className="assistant-preview-dialog"
        aria-labelledby="schedule-preview-title"
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            event.currentTarget.close();
          }
        }}
      >
        <div className="assistant-preview-dialog-shell">
          <header className="assistant-preview-dialog-header">
            <div>
              <span className="section-kicker">Podgląd przed publikacją</span>
              <h2 id="schedule-preview-title">Sprawdź propozycję grafiku</h2>
              <p>
                {generation.scopeLabel} · {generation.rangeLabel}
              </p>
            </div>
            <button
              type="button"
              aria-label="Zamknij podgląd"
              onClick={() => dialogRef.current?.close()}
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <section className="assistant-preview">
            <header>
              <div className={`assistant-preview-status ${complete ? "done" : "warning"}`}>
                {complete ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <AlertCircle aria-hidden="true" />
                )}
              </div>
              <div>
                <span className="section-kicker">Wynik asystenta</span>
                <h2>
                  {nothingToAdd
                    ? "Plan jest już kompletny"
                    : complete
                      ? `Gotowe: ${generation.proposals.length} lekcji bez kolizji`
                      : `Potrzebna decyzja: ${generation.hardViolations.length} braków`}
                </h2>
                <p>
                  {nothingToAdd
                    ? "Wszystkie wymagane lekcje są już wpisane. Asystent niczego nie zmienił."
                    : generation.existingSlots > 0
                      ? `${generation.existingSlots} istniejących lekcji pozostawiono bez zmian.`
                      : "Grafik został ułożony od pustego okresu."}
                </p>
              </div>
            </header>

            {generation.hardViolations.length ? (
              <div className="assistant-issues">
                <strong>Co trzeba poprawić</strong>
                <ul>
                  {generation.hardViolations.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
                <p>{generation.suggestions[0]}</p>
              </div>
            ) : null}

            <div className="assistant-proposal-list">
              {generation.proposals.map((proposal) => (
                <article key={proposal.id}>
                  <div>
                    <span>{proposal.dateLabel}</span>
                    <strong>{proposal.timeLabel}</strong>
                  </div>
                  <div>
                    <h3>{proposal.groupName}</h3>
                    <p>
                      {proposal.teacherName} · {proposal.roomName}
                    </p>
                    <small>{proposal.explanation}</small>
                  </div>
                </article>
              ))}
            </div>

            {nothingToAdd ? (
              <div className="assistant-already-applied">
                <CheckCircle2 aria-hidden="true" />
                Nie ma nic do opublikowania.
              </div>
            ) : complete && generation.status === "READY" ? (
              <form
                action={applyScheduleGenerationAction}
                className="assistant-apply"
              >
                <input type="hidden" name="generationId" value={generation.id} />
                <label>
                  <input type="checkbox" required />
                  <span>
                    Sprawdziłem propozycję. Chcę opublikować te lekcje w planie.
                  </span>
                </label>
                <button className="button button-primary" type="submit">
                  <CheckCircle2 aria-hidden="true" /> Zatwierdź i opublikuj
                </button>
              </form>
            ) : generation.status === "APPLIED" ? (
              <div className="assistant-already-applied">
                <CheckCircle2 aria-hidden="true" />
                Ta propozycja jest już opublikowana.
              </div>
            ) : null}
          </section>
        </div>
      </dialog>
    </>
  );
}
