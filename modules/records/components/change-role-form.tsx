"use client";
import { useActionState } from "react";
import styles from "./change-role-form.module.css";
import { ActionForm } from "@/modules/forms/action-form";
import { changePersonRoleAction, type ChangeRoleState } from "../change-role-action";
const initial: ChangeRoleState = { status: "idle" };
export function ChangeRoleForm({ id, role }: { id: string; role: "PARENT" | "STUDENT" | "TEACHER" }) {
  const [state, action, pending] = useActionState(changePersonRoleAction, initial);
  return <details className={styles.panel}><summary>Zmień rolę osoby</summary><ActionForm state={state} action={action} className={styles.form}>
    <input type="hidden" name="id" value={id} />
    <label>Nowa rola<select name="role" defaultValue={role} key={role}><option value="PARENT">Rodzic</option><option value="STUDENT">Uczeń</option><option value="TEACHER">Wykładowca</option></select></label>
    <p>Osoba zostanie wylogowana. Powiązania wynikające z poprzedniej roli przestaną dawać dostęp. Historia pozostanie zachowana.</p>
    <label className={styles.confirmation}><input type="checkbox" name="confirmation" value="yes" required /> Potwierdzam zmianę roli i dostępu.</label>
    <button className="button button-secondary" disabled={pending}>{pending ? "Zmiana roli…" : "Zapisz nową rolę"}</button><p role="status">{state.message}</p>
  </ActionForm></details>;
}
