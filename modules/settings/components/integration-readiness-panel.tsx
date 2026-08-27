"use client";

import {
  CircleAlert,
  Copy,
  ExternalLink,
  Folder,
  HardDrive,
  MessageCircleMore,
  Network,
  Server,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  backupDestinationOptions,
  backupRequirements,
  type BackupDestinationKind,
} from "@/modules/backups/config";

const destinationIcons = {
  LOCAL_FOLDER: Folder,
  MOUNTED_STORAGE: HardDrive,
  SFTP: Server,
};

export function IntegrationReadinessPanel({ systemOwner = false }: { systemOwner?: boolean }) {
  const [destination, setDestination] = useState<BackupDestinationKind>("SFTP");
  const [frequency, setFrequency] = useState("codziennie");
  const [retention, setRetention] = useState("30 dni");
  const [copied, setCopied] = useState<"backup" | null>(null);
  const requirements = useMemo(() => backupRequirements(destination), [destination]);

  async function copyChecklist() {
    const text = `Plan kopii: ${backupDestinationOptions.find((item) => item.kind === destination)?.label}, ${frequency}, przechowywanie ${retention}.\nPotrzebne:\n- ${requirements.join("\n- ")}`;
    await navigator.clipboard.writeText(text);
    setCopied("backup");
    window.setTimeout(() => setCopied(null), 2200);
  }

  return (
    <section className="integration-readiness" aria-label="Integracje i kopie zapasowe">
      <article id="meta" className="integration-card">
        <header>
          <span className="record-icon record-icon-blue"><MessageCircleMore aria-hidden="true" /></span>
          <div><span className="section-kicker">Szybkie przejście</span><h2>Facebook Messenger</h2></div>
          <span className="integration-status planning"><ExternalLink aria-hidden="true" /> Osobna karta</span>
        </header>
        <div className="integration-limit compact">
          <ShieldCheck aria-hidden="true" />
          <span><strong>Bez łączenia kont i kopiowania danych uczniów.</strong> Przycisk otwiera zwykły Messenger. Wiadomość oraz odbiorców wybierasz już bezpośrednio w Facebooku.</span>
        </div>
        <footer>
          <a className="button button-primary" href="https://www.messenger.com/" target="_blank" rel="noreferrer">Otwórz Messenger <ExternalLink aria-hidden="true" /></a>
        </footer>
      </article>

      <article id="kopie" className="integration-card backup-planner">
        <header>
          <span className="record-icon record-icon-green"><HardDrive aria-hidden="true" /></span>
          <div><span className="section-kicker">Plan bezpiecznej kopii</span><h2>Wybierz miejsce backupu</h2></div>
          <span className="integration-status planning"><Network aria-hidden="true" /> Tryb planowania</span>
        </header>
        <p className="integration-intro">Wybór poniżej tworzy czytelną listę konfiguracji. Kopie zaczną działać dopiero po podaniu dostępu i wykonaniu testu odtworzenia.</p>
        <fieldset className="backup-destinations">
          <legend>Gdzie przechowywać kopię?</legend>
          {backupDestinationOptions.map((option) => {
            const Icon = destinationIcons[option.kind];
            return <label key={option.kind} className={destination === option.kind ? "active" : undefined}>
              <input type="radio" name="backup-destination" value={option.kind} checked={destination === option.kind} onChange={() => setDestination(option.kind)} />
              <Icon aria-hidden="true" /><span><strong>{option.label}</strong><small>{option.description}</small></span>
            </label>;
          })}
        </fieldset>
        <div className="backup-plan-fields">
          <label>Częstotliwość<select value={frequency} onChange={(event) => setFrequency(event.target.value)}><option>codziennie</option><option>co tydzień</option><option>ręcznie</option></select></label>
          <label>Przechowuj kopie<select value={retention} onChange={(event) => setRetention(event.target.value)}><option>14 dni</option><option>30 dni</option><option>90 dni</option></select></label>
        </div>
        <div className="backup-requirements"><strong>Do uruchomienia potrzebne będą:</strong><ul>{requirements.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <p className="integration-limit compact"><CircleAlert aria-hidden="true" /><span><strong>Zwykłe FTP nie jest zalecane.</strong> Dla danych uczniów wybieramy szyfrowane SFTP, szyfrowaną kopię i osobny test odtworzenia.</span></p>
        <footer>
          {systemOwner ? (
            <Link className="button button-primary" href="/panel/bog#backup-usb">
              <HardDrive aria-hidden="true" /> Wykryj dysk i włącz backup
            </Link>
          ) : (
            <button className="button button-secondary" type="button" onClick={copyChecklist}><Copy aria-hidden="true" /> {copied === "backup" ? "Skopiowano" : "Skopiuj plan dla obsługi technicznej"}</button>
          )}
        </footer>
      </article>
    </section>
  );
}
