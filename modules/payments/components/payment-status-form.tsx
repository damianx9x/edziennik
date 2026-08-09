"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useActionState } from "react";

import { savePaymentStatusAction } from "../actions";
import { paymentStatusLabels, paymentStatusValues } from "../schema";

export function PaymentStatusForm({ students }: { students: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(savePaymentStatusAction, {
    status: "idle" as const,
  });

  return (
    <form action={action} className="stage4-form">
      <div className="stage4-form-heading">
        <span className="stage4-icon stage4-icon-payment">PLN</span>
        <div>
          <span className="section-kicker">Ręczne rozliczenie</span>
          <h2>Ustaw status płatności</h2>
          <p>System nie pobiera pieniędzy i nie łączy się z bankiem.</p>
        </div>
      </div>
      <div className="stage4-form-row">
        <label>
          Uczeń
          <select name="studentId" required defaultValue="">
            <option value="" disabled>Wybierz ucznia</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>{student.name}</option>
            ))}
          </select>
        </label>
        <label>
          Okres
          <input name="period" required maxLength={40} placeholder="np. wrzesień 2026" />
        </label>
      </div>
      <div className="stage4-form-row">
        <label>
          Status
          <select name="status" defaultValue="PENDING">
            {paymentStatusValues.map((status) => (
              <option key={status} value={status}>{paymentStatusLabels[status]}</option>
            ))}
          </select>
        </label>
        <label>
          Termin (opcjonalnie)
          <input name="dueDate" type="date" />
        </label>
      </div>
      <label>
        Krótka notatka administracyjna (opcjonalnie)
        <textarea name="note" maxLength={240} rows={3} placeholder="Bez danych karty, rachunku ani treści przelewu." />
      </label>
      {state.message ? (
        <p className={`stage4-feedback ${state.status}`} role="status">{state.message}</p>
      ) : null}
      <button className="stage4-primary" type="submit" disabled={pending || students.length === 0}>
        {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
        {pending ? "Zapisuję…" : "Zapisz status"}
      </button>
    </form>
  );
}
