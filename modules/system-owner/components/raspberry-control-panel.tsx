"use client";

import {
  Activity, ArchiveRestore, CheckCircle2, CloudUpload, DatabaseBackup, Download, ExternalLink,
  FileKey2, HardDrive, KeyRound, LoaderCircle, Mail, MessageSquareText, Server, Settings2,
  ShieldCheck, TerminalSquare, Thermometer, Usb,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import {
  backupNowAction, clearSftpAction, clearUsbBackupAction,
  configureBackupPolicyAction, configureSmsGateAction, configureSmtpAction,
  configureUsbBackupAction, confirmSftpAction, prepareFullExportAction,
  prepareSftpAction, restartApplicationAction, type ServerActionState, type SftpActionState,
} from "../server-actions";
import type { ImportPreparation, RaspberryStatus, StorageDevice } from "../server-control";
import { classifyStorageTargets } from "../storage";

const initialState: ServerActionState = { status: "idle" };
const initialSftpState: SftpActionState = { status: "idle" };

function bytes(value = 0) {
  return new Intl.NumberFormat("pl-PL", { style: "unit", unit: "gigabyte", maximumFractionDigits: 1 }).format(value / 1024 ** 3);
}

function uptime(value = 0) {
  const days = Math.floor(value / 86_400);
  const hours = Math.floor((value % 86_400) / 3_600);
  return `${days} dni ${hours} godz.`;
}

function Feedback({ state }: { state: ServerActionState }) {
  return state.message ? <p className={`stage4-feedback ${state.status}`} role="status">{state.message}</p> : null;
}

function Unavailable({ message }: { message?: string }) {
  return <section className="owner-panel-card"><header><div><span className="section-kicker">Raspberry Pi</span><h2>Ustawienia serwera</h2></div><Server aria-hidden="true" /></header><p>{message ?? "Panel urządzenia jest dostępny na serwerze Raspberry Pi."}</p></section>;
}

function FullBackupRestore() {
  const fileRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [preparation, setPreparation] = useState<ImportPreparation>();
  const [confirmed, setConfirmed] = useState(false);

  async function json(response: Response) {
    const payload = await response.json().catch(() => ({ message: "Serwer zwrócił nieczytelną odpowiedź." })) as { message?: string; id?: string; chunkSize?: number; offset?: number; preparation?: ImportPreparation };
    if (!response.ok) throw new Error(payload.message ?? "Operacja nie powiodła się.");
    return payload;
  }

  async function uploadAndVerify() {
    const file = fileRef.current?.files?.[0];
    const recoveryKey = keyRef.current?.value.trim();
    if (!file || !recoveryKey) { setError("Wybierz plik .tar.age i wpisz klucz odzyskiwania tej kopii."); return; }
    setPending(true); setError(undefined); setMessage("Przygotowuję bezpieczne przesyłanie…"); setPreparation(undefined); setProgress(0);
    try {
      const started = await json(await fetch("/panel/bog/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", filename: file.name, size: file.size }) }));
      const id = started.id!; const chunkSize = started.chunkSize ?? 5 * 1024 * 1024;
      let offset = started.offset ?? 0;
      while (offset < file.size) {
        const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
        const uploaded = await json(await fetch(`/panel/bog/import?id=${encodeURIComponent(id)}&offset=${offset}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: chunk }));
        offset = uploaded.offset ?? offset + chunk.size;
        setProgress(Math.round((offset / file.size) * 100));
        setMessage(`Przesyłanie kopii: ${Math.round((offset / file.size) * 100)}%`);
      }
      setMessage("Sprawdzam klucz, bazę, dokumenty i wykonuję skan antywirusowy. To może potrwać kilka minut…");
      const verified = await json(await fetch("/panel/bog/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", id, recoveryKey }) }));
      if (keyRef.current) keyRef.current.value = "";
      setPreparation(verified.preparation);
      setMessage("Kopia jest kompletna, bezpieczna, klucz działa, a próbne odtworzenie zakończyło się poprawnie.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się sprawdzić kopii.");
    } finally { setPending(false); }
  }

  async function restore() {
    if (!preparation || !confirmed || !window.confirm("Czy na pewno zastąpić bieżącą bazę i dokumenty zawartością sprawdzonej kopii? Przed zmianą serwer wykona dodatkowy backup.")) return;
    setPending(true); setError(undefined); setMessage("Zlecam bezpieczne odtworzenie…");
    try {
      const result = await json(await fetch("/panel/bog/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore", id: preparation.id, confirmation: "ODTWARZAM KLA" }) }));
      setMessage(`${result.message ?? "Odtwarzanie rozpoczęte"} Strona może być niedostępna przez kilkadziesiąt sekund.`);
      setPreparation(undefined); setConfirmed(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Nie udało się uruchomić odtwarzania."); }
    finally { setPending(false); }
  }

  return <article id="full-import" className="integration-card owner-config-target">
    <header><ArchiveRestore aria-hidden="true" /><div><span className="section-kicker">Odtworzenie po awarii</span><h3>Wgraj pełną kopię</h3></div></header>
    <p>Wybierz zaszyfrowany plik <strong>.tar.age</strong> i klucz pokazany przy pierwszej konfiguracji instalacji, z której pochodzi kopia.</p>
    <div className="owner-config-form owner-config-form-single"><label>Plik pełnej kopii<input ref={fileRef} type="file" accept=".age,application/octet-stream" disabled={pending} /></label><label>Klucz odzyskiwania<input ref={keyRef} type="password" autoComplete="off" spellCheck={false} placeholder="AGE-SECRET-KEY-…" disabled={pending} /></label><button type="button" className="button button-primary" onClick={() => void uploadAndVerify()} disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <FileKey2 aria-hidden="true" />} Prześlij i sprawdź kopię</button></div>
    {pending || progress > 0 ? <div className="owner-import-progress" aria-label={`Postęp przesyłania ${progress}%`}><span style={{ width: `${progress}%` }} /></div> : null}
    {message ? <p className="stage4-feedback success" role="status">{message}</p> : null}{error ? <p className="stage4-feedback error" role="alert">{error}</p> : null}
    {preparation ? <div className="owner-restore-confirm"><strong>Kopia gotowa do odtworzenia</strong><dl><div><dt>Utworzona</dt><dd>{preparation.createdAt}</dd></div><div><dt>Wersja</dt><dd>{preparation.sourceCommit.slice(0, 12)}</dd></div></dl><label className="owner-confirm-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Rozumiem, że bieżąca baza i dokumenty zostaną zastąpione, a obecny stan najpierw trafi do kopii bezpieczeństwa.</label><button type="button" className="button button-danger" onClick={() => void restore()} disabled={!confirmed || pending}><ArchiveRestore aria-hidden="true" /> Odtwórz całą instalację</button></div> : null}
    <p className="integration-limit compact"><ShieldCheck aria-hidden="true" /><span>Klucz jest używany wyłącznie w pamięci do odszyfrowania. Nie trafia do bazy, logów ani ustawień.</span></p>
  </article>;
}

export function RaspberryStatusOverview({ status }: { status: RaspberryStatus }) {
  if (!status.available) return <Unavailable message={status.message} />;
  const memoryUsed = (status.memory?.total ?? 0) - (status.memory?.available ?? 0);
  return <section className="raspberry-control raspberry-overview" aria-labelledby="raspberry-overview-title">
    <header><div><span className="section-kicker">Serwer produkcyjny</span><h2 id="raspberry-overview-title">Raspberry Pi · {status.hostname}</h2><p>Najważniejsze parametry. Ustawienia są w jednym osobnym miejscu.</p></div><span className="integration-status ready"><CheckCircle2 aria-hidden="true" /> Online</span></header>
    <div className="raspberry-metrics">
      <article><Thermometer aria-hidden="true" /><span>Temperatura</span><strong>{status.temperatureC}°C</strong></article>
      <article><Activity aria-hidden="true" /><span>Czas pracy</span><strong>{uptime(status.uptimeSeconds)}</strong></article>
      <article><Server aria-hidden="true" /><span>Pamięć RAM</span><strong>{bytes(memoryUsed)} / {bytes(status.memory?.total)}</strong></article>
      <article><HardDrive aria-hidden="true" /><span>Sejf danych</span><strong>{bytes(status.vaultDisk?.used)} / {bytes(status.vaultDisk?.total)}</strong></article>
    </div>
    <div className="raspberry-service-list">{Object.entries(status.services ?? {}).map(([name, ready]) => <span key={name} className={ready ? "ready" : "error"}><i /> {name}</span>)}<span className={status.autoUnlockEnabled ? "ready" : "error"}><i /> start po zaniku prądu</span></div>
    <footer className="owner-inline-actions"><Link className="button button-primary" href="/panel/bog/ustawienia"><Settings2 aria-hidden="true" /> Otwórz ustawienia serwera</Link><Link className="button button-secondary" href="/panel/bog/logi">Sprawdź logi</Link></footer>
  </section>;
}

export function RaspberryBackupSettings({ status, storage }: { status: RaspberryStatus; storage: StorageDevice[] }) {
  const [usbState, usbAction, usbPending] = useActionState(configureUsbBackupAction, initialState);
  const [policyState, policyAction, policyPending] = useActionState(configureBackupPolicyAction, initialState);
  const [backupState, backupAction, backupPending] = useActionState(backupNowAction, initialState);
  const [exportState, exportAction, exportPending] = useActionState(prepareFullExportAction, initialState);
  const [sftpState, sftpAction, sftpPending] = useActionState(prepareSftpAction, initialSftpState);
  const [sftpConfirmState, sftpConfirmAction, sftpConfirmPending] = useActionState(confirmSftpAction, initialState);
  const [copiedKey, setCopiedKey] = useState(false);
  if (!status.available) return <Unavailable message={status.message} />;

  const { mountedUsb, primaryExternal } = classifyStorageTargets(storage);
  const policy = status.backupPolicy ?? { frequency: "daily", retentionDays: 30 };
  const prepared = sftpState.preparation;

  async function copyPublicKey() {
    if (!prepared) return;
    await navigator.clipboard.writeText(prepared.publicKey);
    setCopiedKey(true);
    window.setTimeout(() => setCopiedKey(false), 2_000);
  }

  return <section id="backup-settings" className="server-settings-section" aria-labelledby="backup-settings-title">
    <header className="server-settings-heading"><span className="record-icon record-icon-green"><DatabaseBackup aria-hidden="true" /></span><div><span className="section-kicker">Dane i ciągłość pracy</span><h2 id="backup-settings-title">Kopie zapasowe</h2><p>Wybierz miejsce, harmonogram i pobierz pełną kopię bez opuszczania tego ekranu.</p></div></header>
    <div className="raspberry-config-grid">
      <article id="backup-usb" className="integration-card owner-config-target">
        <header><Usb aria-hidden="true" /><div><span className="section-kicker">Nośnik przy Raspberry</span><h3>Dodatkowy dysk USB</h3></div></header>
        <p>Wybranie nośnika nie formatuje go ani nie usuwa istniejących plików. Kopia jest szyfrowana przed zapisaniem.</p>
        <form action={usbAction} className="owner-config-form owner-config-form-single"><label>Zamontowany nośnik<select name="mountpoint" required defaultValue={status.usbBackupPath ?? ""}><option value="" disabled>{mountedUsb.length ? "Wybierz wykryty dysk" : "Nie wykryto osobnego dysku USB"}</option>{mountedUsb.map((item) => item.mountpoints?.filter(Boolean).map((path) => <option key={`${item.path}-${path}`} value={path!}>{item.label || item.name} · {bytes(item.size)} · {path}</option>))}{primaryExternal.map((item) => <option key={`primary-${item.path}`} value="" disabled>{item.label || item.name} · główny sejf danych</option>)}</select></label><button className="button button-primary" disabled={usbPending || !mountedUsb.length}>{usbPending ? <LoaderCircle className="spin" /> : <HardDrive aria-hidden="true" />} Użyj do backupu</button></form>
        {!mountedUsb.length && primaryExternal.length ? <p className="integration-limit compact"><HardDrive aria-hidden="true" /><span>Raspberry widzi dysk zewnętrzny, ale przechowuje on już główny sejf danych. Podłącz drugi nośnik albo ustaw SFTP — kopia na tym samym dysku nie chroniłaby przed jego awarią.</span></p> : null}
        {status.usbBackupPath ? <p className="integration-limit compact"><CheckCircle2 aria-hidden="true" /><span>Aktywne miejsce: <strong>{status.usbBackupPath}</strong></span></p> : null}<Feedback state={usbState} />
        {status.usbBackupPath ? <form action={clearUsbBackupAction}><button className="button button-ghost">Przestań kopiować na ten dysk</button></form> : null}
      </article>

      <article id="backup-policy" className="integration-card owner-config-target">
        <header><Activity aria-hidden="true" /><div><span className="section-kicker">Automatyzacja</span><h3>Harmonogram i retencja</h3></div></header><p>Domyślnie kopia powstaje codziennie w nocy. Zmiana nie usuwa od razu żadnego archiwum.</p>
        <form action={policyAction} className="owner-config-form"><label>Jak często<select name="frequency" defaultValue={policy.frequency}><option value="daily">Codziennie</option><option value="weekly">Raz w tygodniu</option><option value="manual">Tylko ręcznie</option></select></label><label>Przechowuj przez<select name="retentionDays" defaultValue={String(policy.retentionDays)}><option value="14">14 dni</option><option value="30">30 dni</option><option value="90">90 dni</option></select></label><button className="button button-primary" disabled={policyPending}>{policyPending ? <LoaderCircle className="spin" /> : <Settings2 aria-hidden="true" />} Zapisz harmonogram</button></form><Feedback state={policyState} />
        <form action={backupAction}><button className="button button-secondary" disabled={backupPending}>{backupPending ? <LoaderCircle className="spin" /> : <DatabaseBackup aria-hidden="true" />} Zrób kopię i sprawdź odtworzenie</button></form><Feedback state={backupState} />
      </article>

      <article id="backup-sftp" className="integration-card owner-config-target">
        <header><CloudUpload aria-hidden="true" /><div><span className="section-kicker">Kopia poza lokalem</span><h3>Zewnętrzny serwer SFTP</h3></div><span className={`integration-status ${status.sftpConfigured ? "ready" : "planning"}`}>{status.sftpConfigured ? <><CheckCircle2 aria-hidden="true" /> Aktywny</> : <>Opcjonalny</>}</span></header>
        <p>Raspberry loguje się kluczem SSH, bez zapisywania hasła do SFTP. Najpierw zobaczysz odcisk serwera i klucz do dodania u dostawcy.</p>
        <form action={sftpAction} className="owner-config-form"><label>Adres serwera<input name="host" required placeholder="backup.example.pl" /></label><label>Port<input name="port" type="number" min="1" max="65535" defaultValue="22" required /></label><label>Login<input name="username" required autoComplete="username" /></label><label>Folder na kopie<input name="remotePath" required defaultValue="kla-backups" /></label><button className="button button-primary" disabled={sftpPending}>{sftpPending ? <LoaderCircle className="spin" /> : <ShieldCheck aria-hidden="true" />} Sprawdź serwer</button></form><Feedback state={sftpState} />
        {prepared ? <div className="sftp-confirmation"><strong>Krok 2 z 2 · potwierdź tożsamość serwera</strong><p>Porównaj odcisk z panelem dostawcy SFTP:</p><code>{prepared.fingerprint}</code><p>Dodaj ten klucz publiczny do konta <strong>{prepared.username}</strong>:</p><code>{prepared.publicKey}</code><button type="button" className="button button-secondary" onClick={copyPublicKey}><KeyRound aria-hidden="true" /> {copiedKey ? "Skopiowano" : "Skopiuj klucz publiczny"}</button><form action={sftpConfirmAction} className="owner-config-form owner-config-form-single">{Object.entries(prepared).map(([name, value]) => <input key={name} type="hidden" name={name} value={String(value)} />)}<label className="owner-confirm-check"><input type="checkbox" name="confirmed" value="yes" required /> Odcisk jest zgodny, a klucz publiczny został dodany u dostawcy.</label><button className="button button-primary" disabled={sftpConfirmPending}>{sftpConfirmPending ? <LoaderCircle className="spin" /> : <CloudUpload aria-hidden="true" />} Włącz i przetestuj SFTP</button></form><Feedback state={sftpConfirmState} /></div> : null}
        {status.sftpConfigured ? <form action={clearSftpAction}><button className="button button-ghost">Wyłącz zewnętrzne SFTP</button></form> : null}
      </article>

      <article id="full-export" className="integration-card owner-config-target">
        <header><Download aria-hidden="true" /><div><span className="section-kicker">Kopia na ten komputer</span><h3>Pobierz pełny eksport</h3></div></header><p>Archiwum obejmuje bazę PostgreSQL i prywatne pliki: kartoteki, umowy, grafik, obecności, materiały, postępy, wiadomości, statystyki i historię zmian.</p><p className="integration-limit compact"><DatabaseBackup aria-hidden="true" /><span>Plik jest zaszyfrowany kluczem odzyskiwania. Pobieranie można wznowić po przerwaniu połączenia.</span></p>
        <form action={exportAction}><button className="button button-primary" disabled={exportPending}>{exportPending ? <LoaderCircle className="spin" /> : <Download aria-hidden="true" />} Przygotuj kopię do pobrania</button></form><Feedback state={exportState} />
        {exportState.downloadUrl ? <div className="owner-export-ready"><a className="button button-secondary" href={exportState.downloadUrl} download={exportState.downloadName}><Download aria-hidden="true" /> Pobierz na ten komputer</a>{exportState.sha256 ? <small>Suma kontrolna SHA-256: <code>{exportState.sha256}</code></small> : null}</div> : null}
      </article>
      <FullBackupRestore />
    </div>
  </section>;
}

function RaspberryCommunicationSettings({ status }: { status: RaspberryStatus }) {
  const [smtpState, smtpAction, smtpPending] = useActionState(configureSmtpAction, initialState);
  const [smsState, smsAction, smsPending] = useActionState(configureSmsGateAction, initialState);
  return <section id="communication-settings" className="server-settings-section" aria-labelledby="communication-settings-title"><header className="server-settings-heading"><span className="record-icon record-icon-blue"><Mail aria-hidden="true" /></span><div><span className="section-kicker">Komunikacja wychodząca</span><h2 id="communication-settings-title">E-mail i SMS</h2><p>Dane są sprawdzane przed zapisem i trafiają do zaszyfrowanego sejfu.</p></div></header><div className="raspberry-config-grid">
    <article id="email-delivery" className="integration-card owner-config-target"><header><Mail aria-hidden="true" /><div><span className="section-kicker">Wysyłka w imieniu szkoły</span><h3>Serwer SMTP</h3></div><span className={`integration-status ${status.emailConfigured ? "ready" : "planning"}`}>{status.emailConfigured ? <><CheckCircle2 aria-hidden="true" /> Aktywny</> : <>Do ustawienia</>}</span></header><p>Wszystko ustawiasz tutaj, w przeglądarce. Po zapisaniu system najpierw wyśle wiadomość testową na adres Twojego konta i dopiero wtedy zachowa dane w zaszyfrowanym sejfie.</p><details className="owner-config-help"><summary>Gdzie znaleźć dane skrzynki home.pl?</summary><ol><li>W Panelu klienta home.pl otwórz wybraną skrzynkę e-mail i skopiuj adres serwera SMTP.</li><li>Jako login wpisz pełny adres skrzynki, a jako hasło — hasło tej skrzynki.</li><li>Wybierz port 587. Jeśli dostawca podaje wyłącznie SSL/TLS, wybierz 465.</li></ol><a href="https://pomoc.home.pl/baza-wiedzy/gdzie-znajde-adresy-serwerow-pocztowych-dla-skrzynki-email" target="_blank" rel="noreferrer">Otwórz oficjalną instrukcję home.pl <ExternalLink aria-hidden="true" /></a></details><form action={smtpAction} className="owner-config-form"><label>Adres nadawcy<input name="from" type="email" required placeholder="kontakt@kingslanguageacademy.pl" /></label><label>Serwer poczty wychodzącej (SMTP)<input name="host" required placeholder="np. serwer123456.home.pl" /></label><label>Port i zabezpieczenie<select name="port" defaultValue="587"><option value="587">587 · STARTTLS (zalecany)</option><option value="465">465 · SSL/TLS</option></select></label><label>Login skrzynki e-mail<input name="user" autoComplete="username" inputMode="email" required placeholder="pełny adres e-mail" /></label><label>Hasło skrzynki / hasło aplikacji<input name="password" type="password" autoComplete="new-password" required /></label><button className="button button-primary" disabled={smtpPending}>{smtpPending ? <LoaderCircle className="spin" /> : <Mail aria-hidden="true" />} Sprawdź, zapisz i wyślij test</button></form><Feedback state={smtpState} /></article>
    <article id="sms-delivery" className="integration-card owner-config-target"><header><MessageSquareText aria-hidden="true" /><div><span className="section-kicker">Bez stałego abonamentu bramki</span><h3>SMS z telefonu Android</h3></div></header><p>Osobny telefon z aplikacją SMS Gateway for Android wysyła wiadomości z własnej karty SIM. Koszt zależy od taryfy operatora.</p><form action={smsAction} className="owner-config-form owner-config-form-single"><label>Login bramki<input name="username" autoComplete="username" required /></label><label>Hasło bramki<input name="password" type="password" autoComplete="new-password" required /></label><button className="button button-primary" disabled={smsPending}>{smsPending ? <LoaderCircle className="spin" /> : <MessageSquareText aria-hidden="true" />} Włącz SMS</button></form><Feedback state={smsState} /></article>
  </div></section>;
}

export function RaspberryControlPanel({ status, storage }: { status: RaspberryStatus; storage: StorageDevice[] }) {
  const remoteSshUrl = process.env.NEXT_PUBLIC_KLA_SSH_URL;
  const [restartState, restartAction, restartPending] = useActionState(restartApplicationAction, initialState);
  if (!status.available) return <Unavailable message={status.message} />;
  return <div className="server-settings-workspace">
    <nav className="raspberry-quick-nav" aria-label="Kategorie ustawień serwera"><a href="#backup-settings"><DatabaseBackup aria-hidden="true" /><span><strong>Backup i eksport</strong><small>Dyski, SFTP, harmonogram i pobieranie</small></span></a><a href="#communication-settings"><Mail aria-hidden="true" /><span><strong>E-mail i SMS</strong><small>Wysyłka wiadomości ze szkoły</small></span></a><a href="#remote-access"><TerminalSquare aria-hidden="true" /><span><strong>Diagnostyka</strong><small>Logi, raport i bezpieczny terminal</small></span></a></nav>
    <RaspberryBackupSettings status={status} storage={storage} />
    <RaspberryCommunicationSettings status={status} />
    <section id="remote-access" className="server-settings-section" aria-labelledby="remote-access-title"><header className="server-settings-heading"><span className="record-icon record-icon-yellow"><TerminalSquare aria-hidden="true" /></span><div><span className="section-kicker">Obsługa techniczna</span><h2 id="remote-access-title">Diagnostyka i dostęp</h2><p>Codzienne działania są w panelu. Terminal zostaje osobnym, dodatkowo chronionym narzędziem.</p></div></header><div className="raspberry-config-grid">
      <article className="integration-card"><header><TerminalSquare aria-hidden="true" /><div><span className="section-kicker">Bez ujawniania portu w routerze</span><h3>Terminal Cloudflare</h3></div></header><p>Cloudflare Access uwierzytelnia administratora przed połączeniem SSH. Wyłączenie urządzenia i hasło sejfu nie są dostępne przez stronę.</p>{remoteSshUrl ? <a className="button button-secondary" href={remoteSshUrl} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" /> Otwórz terminal</a> : <p className="integration-limit compact"><TerminalSquare aria-hidden="true" /><span>Adres terminala nie został jeszcze aktywowany w Cloudflare Access.</span></p>}</article>
      <article className="integration-card"><header><ShieldCheck aria-hidden="true" /><div><span className="section-kicker">Bezpieczny zakres</span><h3>Narzędzia serwisowe</h3></div></header><p>Restartuje tylko aplikację eDziennika. Baza, tunel i Raspberry pozostają uruchomione, a watchdog kontroluje powrót strony.</p><form action={restartAction}><button className="button button-secondary" disabled={restartPending}>{restartPending ? <LoaderCircle className="spin" /> : <Activity aria-hidden="true" />} Uruchom ponownie aplikację</button></form><Feedback state={restartState} /><ul className="backup-requirements"><li>hasło i odblokowanie szyfrowanego dysku pozostają poza WWW,</li><li>wyłączenie całego Raspberry wymaga panelu lokalnego,</li><li>instalowane są tylko podpisane paczki aktualizacji.</li></ul><div className="owner-inline-actions"><Link className="button button-secondary" href="/panel/bog/logi">Otwórz logi</Link><a className="button button-secondary" href="/panel/bog/raport" download>Pobierz raport</a></div></article>
    </div></section>
  </div>;
}
