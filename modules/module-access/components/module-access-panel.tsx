"use client";

import { Check, EyeOff, Save, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { saveModuleAccessAction } from "../actions";
import {
  configurableModuleKeys,
  configurableRoles,
  moduleCatalog,
  roleLabels,
  type ModuleAccessPolicy,
} from "../catalog";

export function ModuleAccessPanel({ initialPolicy }: { initialPolicy: ModuleAccessPolicy }) {
  const [policy, setPolicy] = useState(initialPolicy);
  const [state, setState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function save() {
    setState("saving");
    const result = await saveModuleAccessAction(policy);
    setState(result.ok ? "success" : "error");
    setMessage(result.message);
  }

  return (
    <section className="module-access-panel" aria-labelledby="module-access-title">
      <header>
        <span><SlidersHorizontal aria-hidden="true" /></span>
        <div>
          <span className="section-kicker">Funkcje według roli</span>
          <h2 id="module-access-title">Włączaj tylko potrzebne moduły</h2>
          <p>Wyłączona funkcja znika z menu i pulpitu danej roli. Nie da się jej również otworzyć przez bezpośredni adres.</p>
        </div>
      </header>
      <div className="module-access-table-wrap">
        <table className="module-access-table">
          <thead><tr><th scope="col">Moduł</th>{configurableRoles.map((role) => <th scope="col" key={role}>{roleLabels[role]}</th>)}</tr></thead>
          <tbody>
            {configurableModuleKeys.map((key) => (
              <tr key={key}>
                <th scope="row"><strong>{moduleCatalog[key].label}</strong><small>{moduleCatalog[key].description}</small></th>
                {configurableRoles.map((role) => {
                  const supported = moduleCatalog[key].supportedRoles.includes(role);
                  return <td key={role}>
                    <label className={`module-role-switch${supported ? "" : " unsupported"}`}>
                      <input type="checkbox" checked={supported && policy[key][role]} disabled={!supported} onChange={(event) => setPolicy((current) => ({ ...current, [key]: { ...current[key], [role]: event.target.checked } }))} />
                      <span aria-hidden="true" />
                      <em>{supported ? policy[key][role] ? "Włączony" : "Wyłączony" : "Nie dotyczy"}</em>
                    </label>
                  </td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer>
        <p><EyeOff aria-hidden="true" /> Start, logowanie, pomoc i ustawienia bezpieczeństwa pozostają zawsze dostępne.</p>
        <div>
          {message ? <span className={`module-access-status ${state}`} role="status">{state === "success" ? <Check aria-hidden="true" /> : null}{message}</span> : null}
          <button className="button button-primary" type="button" onClick={save} disabled={state === "saving"}><Save aria-hidden="true" /> {state === "saving" ? "Zapisuję…" : "Zapisz moduły"}</button>
        </div>
      </footer>
    </section>
  );
}
