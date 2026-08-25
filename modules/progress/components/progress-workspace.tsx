"use client";

import {
  Activity,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  Info,
  LoaderCircle,
  MessageSquareText,
  Plus,
  TrendingUp,
} from "lucide-react";
import { useActionState, useState } from "react";

import { createProgressObservationAction } from "@/modules/progress/actions";
import type { ProgressActionState } from "@/modules/progress/schema";

type Role = "DIRECTOR" | "TEACHER" | "PARENT" | "STUDENT";
type Skill = "speaking" | "listening" | "reading" | "writing" | "vocabulary" | "grammar";

type Observation = Record<Skill, number> & {
  id: string;
  engagement: number | null;
  note: string | null;
  observedAt: string;
  recordedBy: { id: string; name: string };
  scheduleSlot: { id: string; startAt: string; topic: string | null; group: { id: string; name: string } } | null;
};

export type StudentProgressView = {
  id: string;
  name: string;
  enrollments: { group: { id: string; name: string } }[];
  progressAsStudent: Observation[];
  attendanceAsStudent: { status: string; scheduleSlot: { id: string; startAt: string; group: { id: string; name: string } } }[];
};

const skills: { key: Skill; label: string; short: string }[] = [
  { key: "speaking", label: "Mówienie", short: "Mów." },
  { key: "listening", label: "Rozumienie ze słuchu", short: "Słuch." },
  { key: "reading", label: "Czytanie", short: "Czyt." },
  { key: "writing", label: "Pisanie", short: "Pis." },
  { key: "vocabulary", label: "Słownictwo", short: "Słów." },
  { key: "grammar", label: "Gramatyka", short: "Gram." },
];
const initialState: ProgressActionState = { status: "idle" };

export function ProgressWorkspace({ role, students, initialStudentId }: { role: Role; students: StudentProgressView[]; initialStudentId?: string }) {
  const [studentId, setStudentId] = useState(students.some((item) => item.id === initialStudentId) ? initialStudentId! : students[0]?.id ?? "");
  const [skill, setSkill] = useState<Skill>("speaking");
  const [showForm, setShowForm] = useState(false);
  const student = students.find((item) => item.id === studentId) ?? students[0];
  const canRecord = role === "DIRECTOR" || role === "TEACHER";

  if (!student) {
    return (
      <section className="progress-empty">
        <TrendingUp aria-hidden="true" />
        <h2>Nie ma jeszcze ucznia do pokazania</h2>
        <p>Postępy pojawią się po przypisaniu ucznia do właściwego konta lub grupy.</p>
      </section>
    );
  }

  const attendance = attendanceSummary(student.attendanceAsStudent);
  const latest = student.progressAsStudent.at(-1);
  const previous = student.progressAsStudent.at(-2);

  return (
    <>
      <section className="progress-toolbar">
        <label>
          <span>{role === "STUDENT" ? "Twój profil" : "Uczeń"}</span>
          <select value={student.id} onChange={(event) => setStudentId(event.target.value)} disabled={role === "STUDENT" && students.length === 1}>
            {students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <div>
          <span className="progress-group-label">Grupy</span>
          <strong>{student.enrollments.map(({ group }) => group.name).join(", ") || "Brak aktywnej grupy"}</strong>
        </div>
        {canRecord ? <button className="button button-primary" type="button" onClick={() => setShowForm((value) => !value)} aria-expanded={showForm}><Plus aria-hidden="true" /> Dodaj obserwację</button> : null}
      </section>

      {canRecord && showForm ? <ObservationForm studentId={student.id} studentName={student.name} /> : null}

      <section className="progress-summary-grid" aria-label="Podsumowanie postępów">
        <article>
          <span><Activity aria-hidden="true" /> Ostatnia obserwacja</span>
          <strong>{latest ? formatDate(latest.observedAt) : "Jeszcze nie zapisana"}</strong>
          <small>{latest ? `Zapisał/a: ${latest.recordedBy.name}` : "Wykres zacznie się od pierwszej obserwacji."}</small>
        </article>
        <article>
          <span><CalendarCheck2 aria-hidden="true" /> Obecność</span>
          <strong>{attendance.total ? `${attendance.percent}%` : "Brak danych"}</strong>
          <small>{attendance.total ? `${attendance.present} z ${attendance.total} ostatnich zapisów` : "Obecność jest liczona tylko z zapisanych lekcji."}</small>
        </article>
        <article>
          <span><TrendingUp aria-hidden="true" /> Zapisana zmiana</span>
          <strong>{latest && previous ? describeChange(latest[skill] - previous[skill]) : "Potrzeba 2 obserwacji"}</strong>
          <small>Dla wybranej umiejętności, bez prognozowania zachowania.</small>
        </article>
      </section>

      <section className="progress-chart-card" aria-labelledby="progress-chart-title">
        <header>
          <div>
            <span className="section-kicker">Skala obserwacyjna 1–5</span>
            <h2 id="progress-chart-title">Jak zmieniają się zapisane umiejętności</h2>
            <p>Wybierz obszar. Punkty pochodzą wyłącznie z obserwacji wykładowcy.</p>
          </div>
          <label className="progress-skill-select"><span>Umiejętność</span><select value={skill} onChange={(event) => setSkill(event.target.value as Skill)}>{skills.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select><ChevronDown aria-hidden="true" /></label>
        </header>
        <div className="progress-skill-tabs" role="group" aria-label="Wybierz umiejętność">
          {skills.map((item) => <button key={item.key} type="button" className={skill === item.key ? "active" : undefined} aria-pressed={skill === item.key} onClick={() => setSkill(item.key)}>{item.short}</button>)}
        </div>
        <ProgressChart observations={student.progressAsStudent} skill={skill} label={skills.find((item) => item.key === skill)?.label ?? skill} />
        <p className="progress-legal-note"><Info aria-hidden="true" /> Ten widok opisuje zapisane obserwacje. Nie diagnozuje ucznia i nie przewiduje jego zachowania ani wyników.</p>
      </section>

      <section className="progress-history" aria-labelledby="progress-history-title">
        <header><div><span className="section-kicker">Historia</span><h2 id="progress-history-title">Informacje od wykładowcy</h2></div><span>{student.progressAsStudent.length} wpisów</span></header>
        {student.progressAsStudent.length ? [...student.progressAsStudent].reverse().map((observation) => (
          <details key={observation.id}>
            <summary>
              <span><strong>{formatDate(observation.observedAt)}</strong><small>{observation.scheduleSlot?.group.name ?? student.enrollments[0]?.group.name ?? "Obserwacja ogólna"}</small></span>
              <span className="progress-average">{averageObservation(observation).toFixed(1)} / 5</span>
            </summary>
            <div>
              <dl>{skills.map((item) => <div key={item.key}><dt>{item.label}</dt><dd><span style={{ width: `${observation[item.key] * 20}%` }} />{observation[item.key]} / 5</dd></div>)}</dl>
              {observation.note ? <p><MessageSquareText aria-hidden="true" /><span><strong>Notatka</strong>{observation.note}</span></p> : <p className="progress-no-note">Bez dodatkowej notatki.</p>}
              <small>Zapisał/a: {observation.recordedBy.name}</small>
            </div>
          </details>
        )) : <div className="progress-history-empty"><MessageSquareText aria-hidden="true" /><p>Nie zapisano jeszcze obserwacji. To normalne na początku pracy z modułem.</p></div>}
      </section>
    </>
  );
}

function ObservationForm({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [state, action, pending] = useActionState(createProgressObservationAction, initialState);
  return (
    <section className="progress-observation-form" aria-labelledby="observation-form-title">
      <header><div><span className="section-kicker">Nowa obserwacja</span><h2 id="observation-form-title">{studentName}</h2></div><span className="progress-scale-help">1 — potrzebuje wsparcia · 5 — działa samodzielnie</span></header>
      <form action={action}>
        <input type="hidden" name="studentId" value={studentId} />
        <label><span>Data obserwacji</span><input type="date" name="observedAt" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
        <div className="progress-score-grid">
          {skills.map((item) => <ScoreField key={item.key} name={item.key} label={item.label} />)}
          <ScoreField name="engagement" label="Zaangażowanie (opcjonalnie)" optional />
        </div>
        <label className="progress-note-field"><span>Krótka, rzeczowa notatka <small>(opcjonalnie)</small></span><textarea name="note" maxLength={2000} rows={4} placeholder="Opisz konkret: co już działa i jaki będzie następny mały krok." /></label>
        {state.status !== "idle" ? <p className={`form-status ${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
        <button className="button button-primary" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}{pending ? "Zapisuję…" : "Zapisz obserwację"}</button>
      </form>
    </section>
  );
}

function ScoreField({ name, label, optional = false }: { name: string; label: string; optional?: boolean }) {
  return <fieldset><legend>{label}</legend><div>{[1, 2, 3, 4, 5].map((value) => <label key={value}><input type="radio" name={name} value={value} required={!optional} /><span>{value}</span></label>)}</div></fieldset>;
}

function ProgressChart({ observations, skill, label }: { observations: Observation[]; skill: Skill; label: string }) {
  if (!observations.length) return <div className="progress-chart-empty"><TrendingUp aria-hidden="true" /><p>Wykres pojawi się po pierwszej obserwacji.</p></div>;
  const width = 720;
  const height = 250;
  const padX = 42;
  const padY = 28;
  const points = observations.map((observation, index) => {
    const x = observations.length === 1 ? width / 2 : padX + (index * (width - padX * 2)) / (observations.length - 1);
    const y = padY + ((5 - observation[skill]) * (height - padY * 2)) / 4;
    return { x, y, observation };
  });
  return (
    <div className="progress-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Wykres: ${label}. ${observations.length} zapisanych obserwacji.`}>
        {[1, 2, 3, 4, 5].map((value) => {
          const y = padY + ((5 - value) * (height - padY * 2)) / 4;
          return <g key={value}><line x1={padX} y1={y} x2={width - padX} y2={y} /><text x={18} y={y + 5}>{value}</text></g>;
        })}
        {points.length > 1 ? <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} /> : null}
        {points.map((point) => <g key={point.observation.id}><circle cx={point.x} cy={point.y} r={7} role="img" aria-label={`${formatDate(point.observation.observedAt)}: ${point.observation[skill]} na 5`} /><text className="progress-chart-date" x={point.x} y={height - 5} textAnchor="middle">{shortDate(point.observation.observedAt)}</text></g>)}
      </svg>
    </div>
  );
}

function attendanceSummary(items: StudentProgressView["attendanceAsStudent"]) {
  const decided = items.filter((item) => ["PRESENT", "LATE", "ABSENT", "EXCUSED"].includes(item.status));
  const present = decided.filter((item) => ["PRESENT", "LATE"].includes(item.status)).length;
  return { total: decided.length, present, percent: decided.length ? Math.round((present / decided.length) * 100) : 0 };
}
function averageObservation(item: Observation) { return skills.reduce((sum, skill) => sum + item[skill.key], 0) / skills.length; }
function describeChange(change: number) { return change > 0 ? `+${change} od poprzedniej` : change < 0 ? `${change} od poprzedniej` : "Bez zmiany"; }
function formatDate(value: string) { return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw" }).format(new Date(value)); }
function shortDate(value: string) { return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", timeZone: "Europe/Warsaw" }).format(new Date(value)); }
