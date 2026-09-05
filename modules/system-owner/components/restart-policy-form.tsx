"use client";

import { useActionState } from "react";
import { Clock3, LoaderCircle } from "lucide-react";
import { configureRestartPolicyAction, type ServerActionState } from "../server-actions";
import type { RestartPolicy } from "../restart-policy";

const initial: ServerActionState = { status: "idle" };

export function RestartPolicyForm({ policy }: { policy?: RestartPolicy }) {
  const [state, action, pending] = useActionState(configureRestartPolicyAction, initial);
  return (
    <article className="integration-card" aria-labelledby="restart-policy-title">
      <header>
        <Clock3 aria-hidden="true" />
        <div><span className="section-kicker">Zaplanowana przerwa</span><h3 id="restart-policy-title">Automatyczny restart aplikacji</h3></div>
      </header>
      <p>Opcjonalne odświeżenie aplikacji o wybranej godzinie czasu polskiego. Baza danych, Raspberry i tunel pozostają uruchomione. Watchdog działa także przy wyłączonym harmonogramie.</p>
      <form action={action} className="settings-form" key={JSON.stringify(policy)}>
        <fieldset disabled={pending} className="restart-policy-fields">
          <legend className="sr-only">Harmonogram restartu</legend>
          <label>Częstotliwość
            <select name="frequency" defaultValue={policy?.frequency ?? "off"}>
              <option value="off">Wyłączony — tylko odzyskiwanie po awarii</option>
              <option value="daily">Codziennie</option>
              <option value="weekly">Co niedzielę</option>
            </select>
          </label>
          <div className="restart-policy-time">
            <label>Godzina<input name="hour" type="number" min="0" max="23" required defaultValue={policy?.hour ?? 3} /></label>
            <label>Minuty<input name="minute" type="number" min="0" max="59" required defaultValue={policy?.minute ?? 30} /></label>
          </div>
          <label className="restart-policy-confirm"><input type="checkbox" name="confirmed" value="yes" required />Rozumiem, że restart może na krótko przerwać pracę. Wybieram porę poza zajęciami.</label>
          <button className="button button-primary" disabled={pending}>{pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Clock3 aria-hidden="true" />}{pending ? "Zapisuję…" : "Zapisz harmonogram restartu"}</button>
        </fieldset>
      </form>
      {state.message ? <p className={`stage4-feedback ${state.status}`} role="status">{state.message}</p> : null}
      <p className="muted">Restart jest pomijany podczas backupu, importu lub aktualizacji, bez kopii z ostatnich 48 godzin oraz przez 15 minut od poprzedniej próby. Pominięty termin nie jest wykonywany po następnym włączeniu urządzenia. Niezapisany formularz może wymagać ponowienia.</p>
    </article>
  );
}
