"use client";

import { CalendarClock } from "lucide-react";
import { useActionState } from "react";

import { updateStudentAvailabilityAction } from "@/modules/records/relationship-actions";
import { initialRecordUpdateState } from "@/modules/records/state";

const days = [
  [1, "Poniedziałek"], [2, "Wtorek"], [3, "Środa"],
  [4, "Czwartek"], [5, "Piątek"], [6, "Sobota"],
] as const;
const times = Array.from({ length: 21 }, (_, index) => 720 + index * 30);

export type StudentAvailabilityValue = {
  weekday: number;
  startMinute: number;
  endMinute: number;
};

export function StudentAvailabilityEditor({
  studentId,
  windows,
  actorRole,
}: {
  studentId: string;
  windows: StudentAvailabilityValue[];
  actorRole: "DIRECTOR" | "TEACHER";
}) {
  const [state, action, pending] = useActionState(
    updateStudentAvailabilityAction,
    initialRecordUpdateState,
  );
  return (
    <div className="student-availability-editor">
      <div className="relationship-editor-heading">
        <span><CalendarClock aria-hidden="true" /></span>
        <div>
          <h4>Preferowane godziny ucznia</h4>
          <p>Każdy dzień może mieć inne godziny. Generator spróbuje dopasować do nich grupę.</p>
        </div>
      </div>
      <form action={action}>
        <input type="hidden" name="studentId" value={studentId} />
        <div className="student-availability-days">
          {days.map(([weekday, label]) => {
            const value = windows.find((window) => window.weekday === weekday);
            return (
              <div className="student-availability-day" key={weekday}>
                <label className="student-day-enabled">
                  <input type="checkbox" name={`enabled-${weekday}`} defaultChecked={Boolean(value)} />
                  <span>{label}</span>
                </label>
                <label><span className="sr-only">Od, {label}</span><select name={`start-${weekday}`} defaultValue={value?.startMinute ?? 900}>{times.slice(0, -1).map((time) => <option key={time} value={time}>{formatTime(time)}</option>)}</select></label>
                <span aria-hidden="true">–</span>
                <label><span className="sr-only">Do, {label}</span><select name={`end-${weekday}`} defaultValue={value?.endMinute ?? 1080}>{times.slice(1).map((time) => <option key={time} value={time}>{formatTime(time)}</option>)}</select></label>
              </div>
            );
          })}
        </div>
        <p className="relationship-help">Brak zaznaczonych dni oznacza brak ograniczeń dla generatora.</p>
        {state.message ? <p className={`record-form-message is-${state.status}`} role="status">{state.message}</p> : null}
        <button className="button button-secondary relationship-save" type="submit" disabled={pending}>
          {pending ? "Zapisywanie…" : actorRole === "DIRECTOR" ? "Zapisz preferencje" : "Wyślij preferencje do dyrektora"}
        </button>
      </form>
    </div>
  );
}

function formatTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
