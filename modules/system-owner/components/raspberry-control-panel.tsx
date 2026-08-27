"use client";

import { Activity, CheckCircle2, DatabaseBackup, HardDrive, LoaderCircle, Mail, MessageSquareText, Server, Thermometer, Usb } from "lucide-react";
import { useActionState } from "react";
import { backupNowAction, clearUsbBackupAction, configureSmsGateAction, configureSmtpAction, configureUsbBackupAction, type ServerActionState } from "../server-actions";
import type { RaspberryStatus, StorageDevice } from "../server-control";

const initialState: ServerActionState = { status: "idle" };
function bytes(value = 0) { return new Intl.NumberFormat("pl-PL", { style: "unit", unit: "gigabyte", maximumFractionDigits: 1 }).format(value / 1024 ** 3); }
function uptime(value = 0) { const days = Math.floor(value / 86400); const hours = Math.floor((value % 86400) / 3600); return `${days} dni ${hours} godz.`; }
function flatten(
  devices: StorageDevice[],
  inherited: Pick<StorageDevice, "tran" | "rm" | "hotplug"> = {},
): StorageDevice[] {
  return devices.flatMap((device) => {
    const resolved = {
      ...device,
      tran: device.tran ?? inherited.tran,
      rm: device.rm ?? inherited.rm,
      hotplug: device.hotplug ?? inherited.hotplug,
    };
    return [resolved, ...flatten(device.children ?? [], resolved)];
  });
}

function Feedback({ state }: { state: ServerActionState }) {
  return state.message ? <p className={`stage4-feedback ${state.status}`} role="status">{state.message}</p> : null;
}

export function RaspberryControlPanel({ status, storage }: { status: RaspberryStatus; storage: StorageDevice[] }) {
  const [usbState, usbAction, usbPending] = useActionState(configureUsbBackupAction, initialState);
  const [backupState, backupAction, backupPending] = useActionState(backupNowAction, initialState);
  const [smtpState, smtpAction, smtpPending] = useActionState(configureSmtpAction, initialState);
  const [smsState, smsAction, smsPending] = useActionState(configureSmsGateAction, initialState);
  const externalPartitions = flatten(storage).filter(
    (item) =>
      item.type === "part" &&
      item.mountpoints?.some(Boolean) &&
      (item.tran === "usb" || item.rm || item.hotplug),
  );
  const mountedUsb = externalPartitions.filter((item) =>
    item.mountpoints?.some(
      (path) => path?.startsWith("/media/") || path?.startsWith("/mnt/"),
    ),
  );
  const primaryExternal = externalPartitions.filter(
    (item) => !mountedUsb.some((candidate) => candidate.path === item.path),
  );

  if (!status.available) return <section className="owner-panel-card"><header><div><span className="section-kicker">Raspberry Pi</span><h2>Panel urządzenia</h2></div><Server /></header><p>{status.message}</p></section>;
  const memoryUsed = (status.memory?.total ?? 0) - (status.memory?.available ?? 0);
  return <section className="raspberry-control" aria-labelledby="raspberry-title">
    <header><div><span className="section-kicker">Serwer produkcyjny</span><h2 id="raspberry-title">Raspberry Pi · {status.hostname}</h2><p>Parametry urządzenia, poczta i prawdziwe miejsce szyfrowanego backupu.</p></div><span className="integration-status ready"><CheckCircle2 /> Online</span></header>
    <div className="raspberry-metrics">
      <article><Thermometer /><span>Temperatura</span><strong>{status.temperatureC}°C</strong></article>
      <article><Activity /><span>Czas pracy</span><strong>{uptime(status.uptimeSeconds)}</strong></article>
      <article><Server /><span>Pamięć RAM</span><strong>{bytes(memoryUsed)} / {bytes(status.memory?.total)}</strong></article>
      <article><HardDrive /><span>Sejf danych</span><strong>{bytes(status.vaultDisk?.used)} / {bytes(status.vaultDisk?.total)}</strong></article>
    </div>
    <div className="raspberry-service-list">{Object.entries(status.services ?? {}).map(([name, ready]) => <span key={name} className={ready ? "ready" : "error"}><i /> {name}</span>)}</div>
    <div className="raspberry-config-grid">
      <article className="integration-card"><header><Usb /><div><span className="section-kicker">Wykrywanie USB</span><h3>Dodatkowy dysk backupu</h3></div></header>
        <p>Archiwum jest szyfrowane przed skopiowaniem. Wybranie nośnika nie formatuje go ani nie usuwa istniejących plików.</p>
        <form action={usbAction} className="owner-config-form"><label>Zamontowany nośnik<select name="mountpoint" required defaultValue={status.usbBackupPath ?? ""}><option value="" disabled>{mountedUsb.length ? "Wybierz dysk" : "Nie wykryto osobnego dysku USB do backupu"}</option>{mountedUsb.map((item) => item.mountpoints?.filter(Boolean).map((path) => <option key={`${item.path}-${path}`} value={path!}>{item.label || item.name} · {bytes(item.size)} · {path}</option>))}{primaryExternal.map((item) => <option key={`primary-${item.path}`} value="" disabled>{item.label || item.name} · główny dysk danych, nie może być własną kopią</option>)}</select></label><button className="button button-primary" disabled={usbPending || !mountedUsb.length}>{usbPending ? <LoaderCircle className="spin" /> : <HardDrive />} Użyj do backupu</button></form>
        {!mountedUsb.length && primaryExternal.length ? <p className="integration-limit compact"><HardDrive /><span>Wykryto zewnętrzny dysk używany przez sejf danych. Bezpieczny backup wymaga drugiego nośnika — kopia na tym samym dysku nie chroni przed jego awarią.</span></p> : null}
        {status.usbBackupPath ? <p className="integration-limit compact"><CheckCircle2 /><span>Aktywne miejsce: <strong>{status.usbBackupPath}</strong></span></p> : null}<Feedback state={usbState} />
        <div className="owner-inline-actions"><form action={backupAction}><button className="button button-secondary" disabled={backupPending}>{backupPending ? <LoaderCircle className="spin" /> : <DatabaseBackup />} Backup i test teraz</button></form>{status.usbBackupPath ? <form action={clearUsbBackupAction}><button className="button button-ghost">Odłącz jako cel backupu</button></form> : null}</div><Feedback state={backupState} />
      </article>
      <article className="integration-card"><header><Mail /><div><span className="section-kicker">Wysyłka w imieniu szkoły</span><h3>Konfiguracja SMTP</h3></div></header>
        <p>To ustawienie służy do e-maili. SFTP pozostaje osobną, bezpieczną usługą wyłącznie do kopii zapasowych.</p>
        <form action={smtpAction} className="owner-config-form"><label>Adres nadawcy<input name="from" type="email" required placeholder="kontakt@kingslanguageacademy.pl" /></label><label>Host SMTP<input name="host" required placeholder="smtp.poczta.pl" /></label><label>Port<select name="port" defaultValue="587"><option value="587">587 · STARTTLS</option><option value="465">465 · TLS</option></select></label><label>Login<input name="user" autoComplete="username" required /></label><label>Hasło aplikacji / SMTP<input name="password" type="password" autoComplete="new-password" required /></label><button className="button button-primary" disabled={smtpPending}>{smtpPending ? <LoaderCircle className="spin" /> : <Mail />} Zapisz i uruchom wysyłkę</button></form><Feedback state={smtpState} />
      </article>
      <article className="integration-card"><header><MessageSquareText /><div><span className="section-kicker">Opcja bez abonamentu bramki</span><h3>SMS z telefonu Android</h3></div></header>
        <p>Zainstaluj bezpłatną aplikację SMS Gateway for Android na osobnym telefonie. System użyje jego karty SIM; koszt pojedynczych SMS-ów nadal zależy od taryfy operatora.</p>
        <ol className="backup-requirements"><li>W aplikacji wybierz Public Cloud i utwórz dane dostępu.</li><li>Telefon musi mieć Internet, aktywną kartę SIM i działać w tle.</li><li>Wpisz poniżej wygenerowany login oraz hasło — nie dane do eDziennika.</li></ol>
        <form action={smsAction} className="owner-config-form"><label>Login bramki<input name="username" autoComplete="username" required /></label><label>Hasło bramki<input name="password" type="password" autoComplete="new-password" required /></label><button className="button button-primary" disabled={smsPending}>{smsPending ? <LoaderCircle className="spin" /> : <MessageSquareText />} Włącz SMS</button></form><Feedback state={smsState} />
      </article>
    </div>
  </section>;
}
