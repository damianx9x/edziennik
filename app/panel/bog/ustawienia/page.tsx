import { Settings2, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { requireSystemOwner } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { RaspberryControlPanel } from "@/modules/system-owner/components/raspberry-control-panel";
import { getRaspberryStatus, listMountedStorage } from "@/modules/system-owner/server-control";

export const metadata: Metadata = { title: "Serwer i integracje" };
export const dynamic = "force-dynamic";

export default async function ServerSettingsPage() {
  const session = await requireSystemOwner("/panel/bog/ustawienia");
  const [status, storage] = await Promise.all([getRaspberryStatus(), listMountedStorage()]);

  return <AuthenticatedPanelShell session={session} active="server-settings">
    <header className="role-panel-heading owner-heading">
      <div><span className="section-kicker">Konto obsługi systemu</span><h1>Serwer i integracje</h1><p>Publiczna wizytówka, kopie, poczta, wersje i diagnostyka są ułożone w osobnych kategoriach.</p></div>
      <span className="role-security-chip"><ShieldCheck aria-hidden="true" /> Sekrety w szyfrowanym sejfie</span>
    </header>
    <section className="owner-settings-intro"><Settings2 aria-hidden="true" /><span><strong>Zmiany są wykonywane bezpośrednio na Raspberry.</strong><small>Każda operacja pokazuje wynik i trafia do historii audytowej. Formularze nigdy nie wyświetlają zapisanych haseł.</small></span></section>
    <RaspberryControlPanel status={status} storage={storage} />
  </AuthenticatedPanelShell>;
}
