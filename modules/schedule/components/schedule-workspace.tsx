"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  GripVertical,
  MapPin,
  Move,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import {
  cancelScheduleSlotAction,
  createScheduleSlotAction,
  moveScheduleSlotAction,
  moveScheduleSlotFormAction,
} from "../actions";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  GRID_STEP_MINUTES,
} from "../schema";
import type {
  ScheduleActionState,
  ScheduleResource,
  ScheduleSlotView,
} from "../types";

const initialActionState: ScheduleActionState = {
  status: "idle",
  message: "",
};
const rowHeight = 76;

type ScheduleDay = {
  key: string;
  label: string;
  shortLabel: string;
  dayNumber: string;
  isToday: boolean;
};

type Props = {
  canManage: boolean;
  days: ScheduleDay[];
  groups: ScheduleResource[];
  rooms: ScheduleResource[];
  teachers: ScheduleResource[];
  slots: ScheduleSlotView[];
  previousWeek: string;
  nextWeek: string;
  weekLabel: string;
};

function timeOptions() {
  const values: string[] = [];
  for (
    let minutes = DAY_START_HOUR * 60;
    minutes < DAY_END_HOUR * 60;
    minutes += GRID_STEP_MINUTES
  ) {
    values.push(
      `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
        minutes % 60,
      ).padStart(2, "0")}`,
    );
  }
  return values;
}

const times = timeOptions();

export function ScheduleWorkspace({
  canManage,
  days,
  groups,
  rooms,
  teachers,
  slots,
  previousWeek,
  nextWeek,
  weekLabel,
}: Props) {
  const [selectedDay, setSelectedDay] = useState(
    days.find((day) => day.isToday)?.key ?? days[0]?.key ?? "",
  );
  const [groupFilter, setGroupFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [newDate, setNewDate] = useState(
    days.find((day) => day.isToday)?.key ?? days[0]?.key ?? "",
  );
  const [newStartTime, setNewStartTime] = useState("15:00");
  const [newDuration, setNewDuration] = useState(60);
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newRoomId, setNewRoomId] = useState("");
  const [feedback, setFeedback] = useState<ScheduleActionState>(
    initialActionState,
  );
  const [isMoving, setIsMoving] = useState(false);
  const [createState, createAction, createPending] = useActionState(
    createScheduleSlotAction,
    initialActionState,
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const filteredSlots = useMemo(
    () =>
      slots.filter(
        (slot) =>
          (!groupFilter || slot.groupId === groupFilter) &&
          (!roomFilter || slot.roomId === roomFilter) &&
          (!teacherFilter || slot.teacherId === teacherFilter),
      ),
    [groupFilter, roomFilter, slots, teacherFilter],
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!canManage || !event.over) {
      return;
    }
    const [date, startTime] = String(event.over.id).split("|");
    if (!date || !startTime) {
      return;
    }
    setIsMoving(true);
    startTransition(async () => {
      const result = await moveScheduleSlotAction({
        slotId: String(event.active.id),
        date,
        startTime,
      });
      setFeedback(result);
      setIsMoving(false);
    });
  }

  const activeDay = days.find((day) => day.key === selectedDay) ?? days[0];
  const hasResources = groups.length > 0 && rooms.length > 0 && teachers.length > 0;
  const selectedGroup = groups.find((group) => group.id === newGroupId);
  const [newHour, newMinute] = newStartTime.split(":").map(Number);
  const newStartMinute = newHour * 60 + newMinute;
  const newEndMinute = newStartMinute + newDuration;
  const overlappingSlots = slots.filter((slot) => {
    if (slot.dateKey !== newDate) return false;
    const [slotStartHour, slotStartMinute] = slot.startTime
      .split(":")
      .map(Number);
    const [slotEndHour, slotEndMinute] = slot.endTime.split(":").map(Number);
    const slotStart = slotStartHour * 60 + slotStartMinute;
    const slotEnd = slotEndHour * 60 + slotEndMinute;
    return slotStart < newEndMinute && slotEnd > newStartMinute;
  });
  const selectedStudentIds = new Set(selectedGroup?.studentIds ?? []);
  const groupConflict = overlappingSlots.find(
    (slot) =>
      slot.groupId === newGroupId ||
      slot.studentIds.some((studentId) => selectedStudentIds.has(studentId)),
  );
  const busyTeachers = new Map(
    overlappingSlots.map((slot) => [
      slot.teacherId,
      `prowadzi wtedy grupę ${slot.groupName}`,
    ]),
  );
  const busyRooms = new Map(
    overlappingSlots.map((slot) => [
      slot.roomId,
      `zajęta przez grupę ${slot.groupName}`,
    ]),
  );
  const orderedTeachers = [...teachers].sort((first, second) => {
    const firstAssigned = selectedGroup?.teacherIds?.includes(first.id) ?? false;
    const secondAssigned =
      selectedGroup?.teacherIds?.includes(second.id) ?? false;
    return Number(secondAssigned) - Number(firstAssigned);
  });
  const selectedTeacherUnavailable = newTeacherId
    ? busyTeachers.has(newTeacherId)
    : false;
  const selectedRoom = rooms.find((room) => room.id === newRoomId);
  const selectedRoomUnavailable = newRoomId
    ? busyRooms.has(newRoomId) ||
      (selectedRoom?.capacity !== null &&
        selectedRoom?.capacity !== undefined &&
        selectedRoom.capacity < (selectedGroup?.studentIds?.length ?? 0))
    : false;
  const canCreate =
    hasResources &&
    Boolean(newGroupId && newTeacherId && newRoomId) &&
    !groupConflict &&
    !selectedTeacherUnavailable &&
    !selectedRoomUnavailable;

  return (
    <DndContext id="kla-schedule-board" sensors={sensors} onDragEnd={handleDragEnd}>
      <section className="schedule-toolbar" aria-label="Sterowanie grafikiem">
        <div className="schedule-week-nav">
          <Link
            className="button button-secondary"
            href={`/panel/plan?tydzien=${previousWeek}${
              canManage ? "&tryb=reczny" : ""
            }`}
            aria-label="Poprzedni tydzień"
          >
            ←
          </Link>
          <div>
            <span className="section-kicker">Tydzień</span>
            <strong>{weekLabel}</strong>
          </div>
          <Link
            className="button button-secondary"
            href={`/panel/plan?tydzien=${nextWeek}${
              canManage ? "&tryb=reczny" : ""
            }`}
            aria-label="Następny tydzień"
          >
            →
          </Link>
        </div>

        {canManage ? (
          <details className="schedule-create">
            <summary>
              <CalendarPlus aria-hidden="true" />
              Dodaj zajęcia
            </summary>
            <form action={createAction} className="schedule-create-form">
              <div className="schedule-form-heading">
                <div>
                  <span className="section-kicker">Nowa lekcja</span>
                  <h2>Dodaj lekcję w czterech prostych krokach</h2>
                </div>
                <p>Niedostępne osoby i sale są wyszarzone razem z powodem.</p>
              </div>
              {!hasResources ? (
                <div className="schedule-message schedule-message-error">
                  <AlertTriangle aria-hidden="true" />
                  Najpierw dodaj aktywną salę, grupę i wykładowcę w Kartotekach.
                </div>
              ) : null}
              <div className="schedule-form-grid">
                <label className="schedule-form-step">
                  <span><b>1</b> Grupa</span>
                  <select
                    name="groupId"
                    required
                    value={newGroupId}
                    onChange={(event) => {
                      setNewGroupId(event.target.value);
                      setNewTeacherId("");
                      setNewRoomId("");
                    }}
                  >
                    <option value="" disabled>
                      Wybierz grupę
                    </option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} · {group.studentIds?.length ?? 0} uczniów
                      </option>
                    ))}
                  </select>
                </label>
                <div className="schedule-form-step schedule-form-step-wide">
                  <span><b>2</b> Termin</span>
                  <div className="schedule-form-date-row">
                    <label>
                      Dzień
                      <input
                        type="date"
                        name="date"
                        value={newDate}
                        onChange={(event) => setNewDate(event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Początek
                      <select
                        name="startTime"
                        value={newStartTime}
                        onChange={(event) => setNewStartTime(event.target.value)}
                        required
                      >
                        {times.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Czas
                      <select
                        name="durationMinutes"
                        value={newDuration}
                        onChange={(event) =>
                          setNewDuration(Number(event.target.value))
                        }
                        required
                      >
                        <option value="30">30 min</option>
                        <option value="60">60 min</option>
                        <option value="90">90 min</option>
                        <option value="120">120 min</option>
                      </select>
                    </label>
                  </div>
                </div>
                <label className="schedule-form-step">
                  <span><b>3</b> Wykładowca</span>
                  <select
                    name="teacherId"
                    required
                    value={newTeacherId}
                    onChange={(event) => setNewTeacherId(event.target.value)}
                    disabled={!newGroupId}
                  >
                    <option value="" disabled>
                      {newGroupId ? "Wybierz wykładowcę" : "Najpierw wybierz grupę"}
                    </option>
                    {orderedTeachers.map((teacher) => {
                      const reason = busyTeachers.get(teacher.id);
                      const assigned =
                        selectedGroup?.teacherIds?.includes(teacher.id) ?? false;
                      return (
                        <option
                          key={teacher.id}
                          value={teacher.id}
                          disabled={Boolean(reason)}
                        >
                          {teacher.name}
                          {assigned ? " · przypisany do grupy" : ""}
                          {reason ? ` · niedostępny: ${reason}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label className="schedule-form-step">
                  <span><b>4</b> Sala</span>
                  <select
                    name="roomId"
                    required
                    value={newRoomId}
                    onChange={(event) => setNewRoomId(event.target.value)}
                    disabled={!newGroupId}
                  >
                    <option value="" disabled>
                      {newGroupId ? "Wybierz salę" : "Najpierw wybierz grupę"}
                    </option>
                    {rooms.map((room) => {
                      const busyReason = busyRooms.get(room.id);
                      const tooSmall =
                        room.capacity !== null &&
                        room.capacity !== undefined &&
                        room.capacity <
                          (selectedGroup?.studentIds?.length ?? 0);
                      return (
                        <option
                          key={room.id}
                          value={room.id}
                          disabled={Boolean(busyReason || tooSmall)}
                        >
                          {room.name}
                          {room.capacity ? ` · ${room.capacity} miejsc` : ""}
                          {busyReason ? ` · niedostępna: ${busyReason}` : ""}
                          {tooSmall ? " · za mała dla tej grupy" : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>
              {groupConflict ? (
                <div className="schedule-message schedule-message-error" role="status">
                  <AlertTriangle aria-hidden="true" />
                  {groupConflict.groupId === newGroupId
                    ? `Grupa ${groupConflict.groupName} ma już wtedy lekcję.`
                    : `Co najmniej jeden uczeń tej grupy ma wtedy zajęcia z grupą ${groupConflict.groupName}.`}
                </div>
              ) : newGroupId ? (
                <div className="schedule-availability-ok">
                  <CheckCircle2 aria-hidden="true" />
                  Termin grupy jest wolny. Wybierz dostępnego wykładowcę i salę.
                </div>
              ) : null}
              {createState.message ? (
                <div
                  className={`schedule-message ${
                    createState.status === "error"
                      ? "schedule-message-error"
                      : "schedule-message-success"
                  }`}
                  role="status"
                >
                  {createState.status === "error" ? (
                    <AlertTriangle aria-hidden="true" />
                  ) : (
                    <CheckCircle2 aria-hidden="true" />
                  )}
                  {createState.message}
                </div>
              ) : null}
              <button
                className="button button-primary"
                type="submit"
                disabled={!canCreate || createPending}
              >
                {createPending ? "Sprawdzam dostępność…" : "Dodaj do grafiku"}
              </button>
            </form>
          </details>
        ) : null}
      </section>

      <section className="schedule-filters" aria-label="Filtry grafiku">
        <label>
          Grupa
          <select
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
          >
            <option value="">Wszystkie grupy</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Wykładowca
          <select
            value={teacherFilter}
            onChange={(event) => setTeacherFilter(event.target.value)}
          >
            <option value="">Wszyscy wykładowcy</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sala
          <select
            value={roomFilter}
            onChange={(event) => setRoomFilter(event.target.value)}
          >
            <option value="">Wszystkie sale</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="schedule-clear-filters"
          type="button"
          onClick={() => {
            setGroupFilter("");
            setRoomFilter("");
            setTeacherFilter("");
          }}
        >
          Wyczyść filtry
        </button>
      </section>

      <div className="schedule-mobile-days" role="tablist" aria-label="Dni tygodnia">
        {days.map((day) => (
          <button
            key={day.key}
            type="button"
            role="tab"
            aria-selected={day.key === activeDay?.key}
            onClick={() => setSelectedDay(day.key)}
          >
            <span>{day.shortLabel}</span>
            <strong>{day.dayNumber}</strong>
          </button>
        ))}
      </div>

      <div
        className={`schedule-live-message ${
          feedback.status === "error" ? "error" : ""
        }`}
        aria-live="polite"
      >
        {isMoving
          ? "Sprawdzam nowy termin…"
          : feedback.message ||
            (canManage
              ? "Przeciągnij lekcję albo wybierz „Zmień termin”."
              : "Widzisz wyłącznie zajęcia przypisanych grup.")}
      </div>

      {filteredSlots.length === 0 ? (
        <div className="schedule-empty">
          <CalendarPlus aria-hidden="true" />
          <div>
            <h2>Ten tydzień jest jeszcze pusty</h2>
            <p>
              {canManage
                ? "Dodaj pierwsze zajęcia. System od razu sprawdzi trzy rodzaje kolizji."
                : "Dyrektor nie przypisał jeszcze zajęć do Twoich grup."}
            </p>
          </div>
        </div>
      ) : null}
      {filteredSlots.length > 0 &&
      !filteredSlots.some((slot) => slot.dateKey === activeDay?.key) ? (
        <div className="schedule-day-empty-mobile" role="status">
          <CheckCircle2 aria-hidden="true" />
          <span>
            <strong>W tym dniu nie ma zajęć</strong>
            <small>Wybierz inny dzień powyżej, aby zobaczyć lekcje.</small>
          </span>
        </div>
      ) : null}

      <section className="schedule-board" aria-label={`Grafik: ${weekLabel}`}>
        <div className="schedule-time-column" aria-hidden="true">
          <div className="schedule-day-header-spacer" />
          <div className="schedule-time-track">
            {times.map((time, index) => (
              <span key={time} style={{ top: index * rowHeight - 8 }}>
                {time}
              </span>
            ))}
          </div>
        </div>
        {days.map((day) => (
          <ScheduleDayColumn
            key={day.key}
            day={day}
            hiddenOnMobile={day.key !== activeDay?.key}
            canManage={canManage}
            slots={filteredSlots.filter((slot) => slot.dateKey === day.key)}
          />
        ))}
      </section>
    </DndContext>
  );
}

function ScheduleDayColumn({
  day,
  slots,
  canManage,
  hiddenOnMobile,
}: {
  day: ScheduleDay;
  slots: ScheduleSlotView[];
  canManage: boolean;
  hiddenOnMobile: boolean;
}) {
  return (
    <div
      className={`schedule-day-column ${
        hiddenOnMobile ? "schedule-day-mobile-hidden" : ""
      }`}
    >
      <header>
        <span>{day.label}</span>
        <strong>{day.dayNumber}</strong>
        {day.isToday ? <small>Dzisiaj</small> : null}
      </header>
      <div
        className="schedule-day-track"
        style={{ height: times.length * rowHeight }}
      >
        {times.map((time, index) => (
          <ScheduleDropCell
            key={time}
            id={`${day.key}|${time}`}
            time={time}
            index={index}
            enabled={canManage}
          />
        ))}
        {slots.map((slot) => (
          <LessonCard key={slot.id} slot={slot} canManage={canManage} />
        ))}
      </div>
    </div>
  );
}

function ScheduleDropCell({
  id,
  time,
  index,
  enabled,
}: {
  id: string;
  time: string;
  index: number;
  enabled: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled: !enabled,
  });
  return (
    <div
      ref={setNodeRef}
      className={`schedule-drop-cell ${isOver ? "valid-target" : ""}`}
      style={{ top: index * rowHeight, height: rowHeight }}
      aria-label={`Termin ${id.replace("|", " o ")}`}
    >
      <span className="schedule-mobile-time">{time}</span>
    </div>
  );
}

function LessonCard({
  slot,
  canManage,
}: {
  slot: ScheduleSlotView;
  canManage: boolean;
}) {
  const [moveState, moveAction, movePending] = useActionState(
    moveScheduleSlotFormAction,
    initialActionState,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelScheduleSlotAction,
    initialActionState,
  );
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: slot.id,
      disabled: !canManage,
      data: { slot },
    });
  const [hour, minute] = slot.startTime.split(":").map(Number);
  const offsetMinutes =
    (hour - DAY_START_HOUR) * 60 + (Number.isFinite(minute) ? minute : 0);
  const top = (offsetMinutes / GRID_STEP_MINUTES) * rowHeight + 3;
  const height = Math.max(
    68,
    (slot.durationMinutes / GRID_STEP_MINUTES) * rowHeight - 6,
  );
  const style = {
    top,
    height,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 20 : 4,
  } satisfies CSSProperties;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`schedule-lesson ${isDragging ? "dragging" : ""}`}
    >
      <div className="schedule-lesson-main">
        {canManage ? (
          <button
            type="button"
            className="schedule-drag-handle"
            aria-label={`Przenieś zajęcia grupy ${slot.groupName}`}
            {...listeners}
            {...attributes}
          >
            <GripVertical aria-hidden="true" />
          </button>
        ) : null}
        <div>
          <span>
            {slot.startTime}–{slot.endTime}
          </span>
          <strong>{slot.groupName}</strong>
          <small>
            <MapPin aria-hidden="true" /> {slot.roomName}
          </small>
          <small>
            <Users aria-hidden="true" /> {slot.teacherName}
          </small>
        </div>
      </div>
      {canManage ? (
        <details className="schedule-lesson-actions">
          <summary aria-label={`Opcje zajęć grupy ${slot.groupName}`}>•••</summary>
          <div>
            <form action={moveAction}>
              <input type="hidden" name="slotId" value={slot.id} />
              <label>
                Nowy dzień
                <input type="date" name="date" defaultValue={slot.dateKey} required />
              </label>
              <label>
                Nowa godzina
                <select name="startTime" defaultValue={slot.startTime}>
                  {times.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </label>
              {moveState.message ? (
                <p
                  className={`assistant-form-message ${moveState.status}`}
                  role="status"
                >
                  {moveState.message}
                </p>
              ) : null}
              <button
                className="button button-secondary"
                type="submit"
                disabled={movePending}
              >
                <Move aria-hidden="true" />{" "}
                {movePending ? "Sprawdzam…" : "Zmień termin"}
              </button>
            </form>
            <form action={cancelAction} className="schedule-cancel-form">
              <input type="hidden" name="slotId" value={slot.id} />
              <label>
                <input type="checkbox" required />
                Potwierdzam odwołanie tych zajęć
              </label>
              {cancelState.message ? (
                <p
                  className={`assistant-form-message ${cancelState.status}`}
                  role="status"
                >
                  {cancelState.message}
                </p>
              ) : null}
              <button
                className="schedule-cancel"
                type="submit"
                disabled={cancelPending}
              >
                {cancelPending ? "Odwołuję…" : "Odwołaj zajęcia"}
              </button>
            </form>
          </div>
        </details>
      ) : null}
      {slot.topic ? (
        <p className="schedule-topic">
          <Clock3 aria-hidden="true" /> {slot.topic}
        </p>
      ) : null}
    </article>
  );
}
