import { EyeOff } from "lucide-react";
import Link from "next/link";

import { requireActiveSession } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { moduleLabel } from "@/modules/module-access/server";

export default async function DisabledModulePage({ searchParams }: { searchParams: Promise<{ modul?: string }> }) {
  const session = await requireActiveSession("/panel/modul-wylaczony");
  const { modul = "" } = await searchParams;
  return <AuthenticatedPanelShell session={session}>
    <section className="disabled-module-card">
      <span><EyeOff aria-hidden="true" /></span>
      <div><span className="section-kicker">Funkcja wyłączona dla tej roli · {moduleLabel(modul)}</span><h1>Ten obszar jest teraz niedostępny</h1><p>Właściciel systemu zdecydował, że szkoła nie korzysta obecnie z tej funkcji w Twoim panelu. Twoje wcześniejsze dane nie zostały usunięte.</p></div>
      <Link className="button button-primary" href="/panel">Wróć na start</Link>
    </section>
  </AuthenticatedPanelShell>;
}
