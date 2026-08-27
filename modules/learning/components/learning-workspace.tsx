"use client";

import {
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FilePlus2,
  GraduationCap,
  LoaderCircle,
  MessageSquareText,
  Send,
  Search,
  Users,
  Upload,
} from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import {
  createHomeworkAssignmentAction,
  createLearningMaterialAction,
  reviewHomeworkAction,
  submitHomeworkAction,
} from "@/modules/learning/actions";
import type { LearningActionState } from "@/modules/learning/schema";

type Role = "DIRECTOR" | "TEACHER" | "PARENT" | "STUDENT";

type Submission = {
  id: string;
  status: "NOT_OPENED" | "OPENED" | "SUBMITTED" | "LATE" | "REVIEWED";
  studentNote: string | null;
  teacherFeedback: string | null;
  submittedAt: string | null;
  storedFileId: string | null;
  student: { id: string; name: string };
};

export type LearningGroupView = {
  id: string;
  name: string;
  location: { id: string; name: string; isOnline: boolean };
  enrollments: { student: { id: string; name: string } }[];
  teachers: { teacher: { id: string; name: string } }[];
  learningMaterials: {
    id: string;
    title: string;
    description: string | null;
    externalUrl: string | null;
    storedFileId: string | null;
    publishedAt: string;
    audience: string;
    recipients: { userId: string; user: { name: string } }[];
    createdBy: { id: string; name: string };
  }[];
  homeworkAssignments: {
    id: string;
    title: string;
    instructions: string;
    dueAt: string | null;
    publishedAt: string;
    createdBy: { id: string; name: string };
    submissions: Submission[];
  }[];
};

const initialState: LearningActionState = { status: "idle" };

export function LearningWorkspace({
  role,
  groups,
}: {
  role: Role;
  groups: LearningGroupView[];
}) {
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id ?? "");
  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) ?? groups[0],
    [activeGroupId, groups],
  );
  const canPublish = role === "DIRECTOR" || role === "TEACHER";

  if (!activeGroup) {
    return (
      <section className="learning-empty" aria-labelledby="learning-empty-title">
        <BookOpenCheck aria-hidden="true" />
        <h2 id="learning-empty-title">Nie ma jeszcze przypisanej grupy</h2>
        <p>
          Gdy dyrektor przypisze grupę, tutaj automatycznie pojawią się jej materiały i zadania.
        </p>
      </section>
    );
  }

  const homeworkCount = activeGroup.homeworkAssignments.length;
  const pendingCount = activeGroup.homeworkAssignments.filter((assignment) =>
    assignment.submissions.some((submission) =>
      ["NOT_OPENED", "OPENED", "SUBMITTED", "LATE"].includes(submission.status),
    ),
  ).length;

  return (
    <>
      <section className="learning-toolbar" aria-label="Wybór grupy i podsumowanie">
        <label>
          <span>Grupa</span>
          <select value={activeGroup.id} onChange={(event) => setActiveGroupId(event.target.value)}>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} · {group.location.name}
              </option>
            ))}
          </select>
        </label>
        <div className="learning-metrics">
          <span><strong>{activeGroup.learningMaterials.length}</strong> materiałów</span>
          <span><strong>{homeworkCount}</strong> zadań</span>
          <span><strong>{pendingCount}</strong> do działania</span>
        </div>
      </section>

      {canPublish ? <PublisherPanel group={activeGroup} /> : null}

      <div className="learning-columns">
        <section className="learning-section" aria-labelledby="materials-title">
          <header>
            <div className="learning-section-icon"><BookOpenCheck aria-hidden="true" /></div>
            <div>
              <span className="section-kicker">Do powtórki</span>
              <h2 id="materials-title">Materiały</h2>
            </div>
          </header>
          <div className="learning-list">
            {activeGroup.learningMaterials.length ? activeGroup.learningMaterials.map((material) => (
              <article className="learning-card" key={material.id}>
                <div>
                  <h3>{material.title}</h3>
                  <p>{material.description || "Materiał udostępniony grupie."}</p>
                </div>
                <small>{material.createdBy.name} · {formatDate(material.publishedAt)}</small>
                <span className="learning-audience-chip"><Users aria-hidden="true" /> {material.audience === "GROUP" ? "Cała grupa" : material.recipients.map((item) => item.user.name).join(", ")}</span>
                <div className="learning-card-actions">
                  {material.storedFileId ? (
                    <a className="button button-secondary" href={`/panel/nauka/plik/${material.storedFileId}`} target="_blank" rel="noreferrer">
                      <Download aria-hidden="true" /> Otwórz plik
                    </a>
                  ) : null}
                  {material.externalUrl ? (
                    <a className="button button-secondary" href={material.externalUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink aria-hidden="true" /> Otwórz link
                    </a>
                  ) : null}
                </div>
              </article>
            )) : <EmptyList label="W tej grupie nie ma jeszcze materiałów." />}
          </div>
        </section>

        <section className="learning-section" aria-labelledby="homework-title">
          <header>
            <div className="learning-section-icon"><GraduationCap aria-hidden="true" /></div>
            <div>
              <span className="section-kicker">Krok po kroku</span>
              <h2 id="homework-title">Zadania</h2>
            </div>
          </header>
          <div className="learning-list">
            {activeGroup.homeworkAssignments.length ? activeGroup.homeworkAssignments.map((assignment) => (
              <HomeworkCard key={assignment.id} assignment={assignment} role={role} />
            )) : <EmptyList label="Nie ma teraz zadań do wykonania." />}
          </div>
        </section>
      </div>
    </>
  );
}

function PublisherPanel({ group }: { group: LearningGroupView }) {
  const [mode, setMode] = useState<"material" | "homework">("material");
  const [audience, setAudience] = useState<"GROUP" | "STUDENTS" | "TEACHERS">("GROUP");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [materialState, materialAction, materialPending] = useActionState(createLearningMaterialAction, initialState);
  const [homeworkState, homeworkAction, homeworkPending] = useActionState(createHomeworkAssignmentAction, initialState);

  return (
    <section className="learning-publisher" aria-labelledby="learning-publisher-title">
      <header>
        <div>
          <span className="section-kicker">Publikuj dla: {group.name}</span>
          <h2 id="learning-publisher-title">Dodaj coś dla grupy</h2>
          <p>Wybierz jeden prosty formularz. Po zapisie treść od razu trafi do właściwych osób.</p>
        </div>
        <div className="learning-publisher-tabs" role="group" aria-label="Rodzaj treści">
          <button type="button" className={mode === "material" ? "active" : undefined} aria-pressed={mode === "material"} onClick={() => setMode("material")}>
            <FilePlus2 aria-hidden="true" /> Materiał
          </button>
          <button type="button" className={mode === "homework" ? "active" : undefined} aria-pressed={mode === "homework"} onClick={() => setMode("homework")}>
            <GraduationCap aria-hidden="true" /> Zadanie
          </button>
        </div>
      </header>

      {mode === "material" ? (
        <form action={materialAction} className="learning-form">
          <input type="hidden" name="groupId" value={group.id} />
          <label><span>Tytuł</span><input name="title" required minLength={2} maxLength={140} placeholder="np. Powtórka: Past Simple" /></label>
          <label className="learning-wide"><span>Krótki opis <small>(opcjonalnie)</small></span><textarea name="description" rows={3} maxLength={2000} placeholder="Napisz, co warto zrobić z tym materiałem." /></label>
          <label><span>Plik PDF, JPG lub PNG</span><input name="file" type="file" accept="application/pdf,image/jpeg,image/png" /></label>
          <label><span>albo bezpieczny link</span><input name="externalUrl" type="url" inputMode="url" placeholder="https://…" /></label>
          <label className="learning-wide"><span>Odbiorcy</span><select name="audience" value={audience} onChange={(event) => { setAudience(event.target.value as typeof audience); setRecipientIds([]); setRecipientQuery(""); }}><option value="GROUP">Cała grupa</option><option value="STUDENTS">Wybrani uczniowie</option><option value="TEACHERS">Wybrani wykładowcy</option></select></label>
          {audience !== "GROUP" ? <RecipientPicker audience={audience} group={group} query={recipientQuery} onQuery={setRecipientQuery} selectedIds={recipientIds} onSelected={setRecipientIds} /> : null}
          <p className="learning-form-help learning-wide">Dodaj plik albo link — nie oba jednocześnie. Maksymalny rozmiar pliku: 15 MB.</p>
          <ActionFeedback state={materialState} />
          <button className="button button-primary learning-submit" type="submit" disabled={materialPending}>
            {materialPending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
            {materialPending ? "Publikuję…" : "Opublikuj materiał"}
          </button>
        </form>
      ) : (
        <form action={homeworkAction} className="learning-form">
          <input type="hidden" name="groupId" value={group.id} />
          <label><span>Tytuł</span><input name="title" required minLength={2} maxLength={140} placeholder="np. Ćwiczenia 1–4" /></label>
          <label><span>Termin <small>(opcjonalnie)</small></span><input name="dueAt" type="datetime-local" /></label>
          <label className="learning-wide"><span>Instrukcja dla ucznia</span><textarea name="instructions" required minLength={3} maxLength={5000} rows={4} placeholder="Napisz dokładnie, co trzeba zrobić." /></label>
          <ActionFeedback state={homeworkState} />
          <button className="button button-primary learning-submit" type="submit" disabled={homeworkPending}>
            {homeworkPending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
            {homeworkPending ? "Publikuję…" : "Wyślij zadanie grupie"}
          </button>
        </form>
      )}
    </section>
  );
}

function RecipientPicker({
  audience,
  group,
  query,
  onQuery,
  selectedIds,
  onSelected,
}: {
  audience: "STUDENTS" | "TEACHERS";
  group: LearningGroupView;
  query: string;
  onQuery: (value: string) => void;
  selectedIds: string[];
  onSelected: (value: string[]) => void;
}) {
  const options = audience === "STUDENTS"
    ? group.enrollments.map(({ student }) => student)
    : group.teachers.map(({ teacher }) => teacher);
  const needle = query.trim().toLocaleLowerCase("pl-PL");
  const visible = options
    .filter((item) => !needle || item.name.toLocaleLowerCase("pl-PL").includes(needle))
    .sort((left, right) => Number(selectedIds.includes(right.id)) - Number(selectedIds.includes(left.id)) || left.name.localeCompare(right.name, "pl"))
    .slice(0, needle ? 12 : 5);
  return <fieldset className="learning-recipient-picker learning-wide">
    <legend>{audience === "STUDENTS" ? "Wybierz uczniów" : "Wybierz wykładowców"}</legend>
    {selectedIds.map((id) => <input key={id} type="hidden" name="recipientIds" value={id} />)}
    {options.length > 5 ? <label className="relationship-search"><Search aria-hidden="true" /><span className="sr-only">Szukaj odbiorcy</span><input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Wpisz imię lub nazwisko" /></label> : null}
    <div className="learning-recipient-options">{visible.map((item) => <label key={item.id}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(event) => onSelected(event.target.checked ? [...new Set([...selectedIds, item.id])] : selectedIds.filter((id) => id !== item.id))} /><span>{item.name}</span></label>)}</div>
    <small>{selectedIds.length ? `Wybrano: ${selectedIds.length}` : "Wybierz co najmniej jedną osobę."}{!needle && options.length > 5 ? " Pokazujemy 5 propozycji — użyj wyszukiwarki, aby znaleźć pozostałe." : ""}</small>
  </fieldset>;
}

function HomeworkCard({ assignment, role }: { assignment: LearningGroupView["homeworkAssignments"][number]; role: Role }) {
  const ownSubmission = role === "STUDENT" ? assignment.submissions[0] : undefined;
  const [submissionState, submissionAction, submissionPending] = useActionState(submitHomeworkAction, initialState);
  const dueState = getDueState(assignment.dueAt);

  return (
    <article className="learning-card homework-card">
      <header>
        <div>
          <h3>{assignment.title}</h3>
          <p>{assignment.instructions}</p>
        </div>
        <span className={`homework-due ${dueState.tone}`}><Clock3 aria-hidden="true" /> {dueState.label}</span>
      </header>

      {role === "STUDENT" && ownSubmission ? (
        <div className="homework-student-zone">
          <SubmissionStatus status={ownSubmission.status} />
          {ownSubmission.teacherFeedback ? (
            <div className="homework-feedback"><MessageSquareText aria-hidden="true" /><span><strong>Informacja od wykładowcy</strong>{ownSubmission.teacherFeedback}</span></div>
          ) : null}
          <form action={submissionAction} className="homework-submit-form">
            <input type="hidden" name="assignmentId" value={assignment.id} />
            <label><span>Twoja odpowiedź</span><textarea name="studentNote" rows={3} maxLength={3000} placeholder="Możesz wpisać odpowiedź lub krótką wiadomość." /></label>
            <label className="homework-file"><span>Załącz plik <small>(PDF, JPG lub PNG)</small></span><input name="file" type="file" accept="application/pdf,image/jpeg,image/png" /></label>
            <ActionFeedback state={submissionState} />
            <button className="button button-primary" type="submit" disabled={submissionPending}>
              {submissionPending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
              {submissionPending ? "Przekazuję…" : ownSubmission.submittedAt ? "Wyślij poprawioną pracę" : "Oddaj pracę"}
            </button>
          </form>
        </div>
      ) : null}

      {role === "PARENT" ? (
        <div className="homework-submission-list">
          {assignment.submissions.map((submission) => (
            <div key={submission.id}><strong>{submission.student.name}</strong><SubmissionStatus status={submission.status} />{submission.teacherFeedback ? <p>{submission.teacherFeedback}</p> : null}</div>
          ))}
        </div>
      ) : null}

      {(role === "DIRECTOR" || role === "TEACHER") ? (
        <div className="homework-submission-list">
          {assignment.submissions.length ? assignment.submissions.map((submission) => (
            <ReviewSubmission key={submission.id} submission={submission} />
          )) : <p className="learning-muted">Do zadania nie przypisano jeszcze uczniów.</p>}
        </div>
      ) : null}
    </article>
  );
}

function ReviewSubmission({ submission }: { submission: Submission }) {
  const [state, action, pending] = useActionState(reviewHomeworkAction, initialState);
  const canReview = ["SUBMITTED", "LATE", "REVIEWED"].includes(submission.status);
  return (
    <details className="homework-review">
      <summary>
        <span><strong>{submission.student.name}</strong><SubmissionStatus status={submission.status} /></span>
        <small>{submission.submittedAt ? formatDateTime(submission.submittedAt) : "Brak oddanej pracy"}</small>
      </summary>
      <div>
        {submission.studentNote ? <p><strong>Odpowiedź:</strong> {submission.studentNote}</p> : null}
        {submission.storedFileId ? <a href={`/panel/nauka/plik/${submission.storedFileId}`} target="_blank" rel="noreferrer"><Download aria-hidden="true" /> Otwórz załącznik ucznia</a> : null}
        {canReview ? (
          <form action={action}>
            <input type="hidden" name="submissionId" value={submission.id} />
            <label><span>Informacja zwrotna</span><textarea name="feedback" required minLength={2} maxLength={3000} rows={3} defaultValue={submission.teacherFeedback ?? ""} placeholder="Co już jest dobrze i co warto poprawić?" /></label>
            <ActionFeedback state={state} />
            <button className="button button-secondary" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}{pending ? "Zapisuję…" : "Przekaż informację"}</button>
          </form>
        ) : <p className="learning-muted">Informację zwrotną dodasz po oddaniu pracy.</p>}
      </div>
    </details>
  );
}

function SubmissionStatus({ status }: { status: Submission["status"] }) {
  const value = {
    NOT_OPENED: ["Nieotwarte", "neutral"],
    OPENED: ["Otwarte", "info"],
    SUBMITTED: ["Oddane", "success"],
    LATE: ["Oddane po terminie", "warning"],
    REVIEWED: ["Sprawdzone", "success"],
  }[status];
  return <span className={`submission-status ${value[1]}`}>{value[0]}</span>;
}

function ActionFeedback({ state }: { state: LearningActionState }) {
  return state.status === "idle" ? null : <p className={`form-status ${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>;
}

function EmptyList({ label }: { label: string }) {
  return <div className="learning-list-empty"><BookOpenCheck aria-hidden="true" /><p>{label}</p></div>;
}

function getDueState(value: string | null) {
  if (!value) return { label: "Bez terminu", tone: "neutral" };
  const due = new Date(value);
  const diff = due.getTime() - Date.now();
  if (diff < 0) return { label: `Termin minął ${formatDateTime(value)}`, tone: "late" };
  if (diff < 48 * 60 * 60 * 1000) return { label: `Do ${formatDateTime(value)}`, tone: "soon" };
  return { label: `Do ${formatDateTime(value)}`, tone: "normal" };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Warsaw" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(new Date(value));
}
