"use client";

import { ActionForm } from "@/modules/forms/action-form";

import { useActionState, useEffect, useRef, useState } from "react";
import { createChildAction, setChildPasswordAction, type FamilyState } from "../family-actions";
const initial: FamilyState = { status: "idle" };

export type FamilyLocation = { id: string; name: string; address: string | null; isOnline: boolean; groups: { id: string; name: string }[] };

export function ChildRequestForm({ locations }: { locations: FamilyLocation[] }) {
  const [state, action, pending] = useActionState(createChildAction, initial);
  const [locationId, setLocationId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const groups = locations.find((location) => location.id === locationId)?.groups ?? [];
  return <ActionForm state={state} action={action} className="family-form">
    <h2>Dodaj dziecko</h2>
    <p>Wypełnij trzy krótkie kroki. Dziecko nie potrzebuje adresu e-mail.</p>
    <fieldset><legend>1. Jak nazywa się dziecko?</legend>
      <label>Imię i nazwisko<input name="name" required minLength={3} maxLength={120} autoComplete="off" placeholder="Np. Anna Kowalska" /></label>
    </fieldset>
    <fieldset><legend>2. Wybierz miejsce i grupę</legend>
      <label>Lokalizacja<select name="locationId" required value={locationId} onChange={(event) => setLocationId(event.target.value)}>
        <option value="">Wybierz miejsce zajęć</option>
        {locations.map((location) => <option key={location.id} value={location.id}>{location.name}{location.isOnline ? " · online" : location.address ? ` · ${location.address}` : ""}</option>)}
      </select></label>
      <label>Grupa<select key={locationId} name="groupId" required defaultValue="" disabled={!locationId || !groups.length}>
        <option value="">{!locationId ? "Najpierw wybierz lokalizację" : groups.length ? "Wybierz grupę dziecka" : "Brak dostępnych grup"}</option>
        {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
      </select></label>
      {locationId && !groups.length && <p>Szkoła nie dodała tu jeszcze grup. Wybierz inne miejsce lub napisz do szkoły.</p>}
    </fieldset>
    <fieldset><legend>3. Ustal hasło dla dziecka</legend>
      <p>Co najmniej 8 znaków. Kilka łatwych słów będzie prostsze do zapamiętania. Hasło możesz później zmienić tutaj.</p>
      <label>Hasło dziecka<input type={showPassword ? "text" : "password"} name="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label>
      <label>Powtórz hasło<input type={showPassword ? "text" : "password"} name="repeatPassword" autoComplete="new-password" required minLength={8} maxLength={128} /></label>
      <button type="button" className="button button-secondary" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Ukryj hasła" : "Pokaż hasła"}</button>
    </fieldset>
    <p>Szkoła potwierdzi wybraną grupę. Jeśli dziecko ma już konto, poproś szkołę o połączenie go z Twoim kontem.</p>
    <button className="button button-primary" disabled={pending || !groups.length}>{pending ? "Dodawanie dziecka…" : "Dodaj dziecko"}</button>
    {state.message && <div className={`family-result family-result-${state.status}`} role="status"><strong>{state.message}</strong>{state.login && <><ChildLogin login={state.login} /><p>Przekaż dziecku login razem z ustalonym hasłem.</p></>}</div>}
  </ActionForm>;
}

export function ChildPasswordForm({ childId, name, login }: { childId: string; name: string; login: string }) {
  const [state, action, pending] = useActionState(setChildPasswordAction, initial);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.status === "success") form.current?.reset(); }, [state]);
  return <><ChildLogin login={login} /><details className="family-access">
    <summary>Ustaw lub zmień hasło — {name}</summary>
    <ActionForm state={state} action={action} ref={form} className="family-form">
      <p>Login dziecka: <strong className="family-login">{login}</strong></p>
      <p>Wpisz hasło dwa razy. Zmiana wyloguje wcześniejsze sesje dziecka. Nie zmienia danych ani grup.</p>
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" autoComplete="username" value={login} />
      <label>Nowe hasło<input type="password" name="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label>
      <label>Powtórz hasło<input type="password" name="repeatPassword" autoComplete="new-password" required minLength={8} maxLength={128} /></label>
      <button className="button button-primary" disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz hasło dziecka"}</button>
      <p role="status">{state.message}</p>
    </ActionForm>
  </details></>;
}

function ChildLogin({ login }: { login: string }) {
  const [message, setMessage] = useState("");
  return <div className="family-login-row"><div><span>Login dziecka</span><strong className="family-login">{login}</strong></div>
    <button type="button" className="button button-secondary" onClick={async () => {
      try { await navigator.clipboard.writeText(login); setMessage("Login skopiowany."); }
      catch { setMessage("Zaznacz login powyżej i skopiuj go ręcznie."); }
    }}>Kopiuj login</button><small className="family-login-hint">{login.includes("@") ? "To wcześniej utworzone konto. Skopiuj pokazany login, aby pomóc dziecku się zalogować." : "Login jest bez spacji i polskich znaków, np. Łucja → lucja. Jeśli taki login był zajęty, dodaliśmy numer."}</small><span role="status">{message}</span>
  </div>;
}
