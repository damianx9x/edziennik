import { AlertTriangle, MapPinned, Radar, ShieldAlert, Smartphone } from "lucide-react";

import type { ProtectedActivity } from "../security-traffic";

type RegionActivity = { code: string; name: string; visits: number };
type DeviceActivity = { label: string; visits: number };

const regions = [
  ["ZP", "Zachodniopomorskie", "zp"], ["PM", "Pomorskie", "pm"], ["WM", "Warmińsko-mazurskie", "wm"], ["PD", "Podlaskie", "pd"],
  ["LB", "Lubuskie", "lb"], ["WP", "Wielkopolskie", "wp"], ["KP", "Kujawsko-pomorskie", "kp"], ["MZ", "Mazowieckie", "mz"],
  ["DS", "Dolnośląskie", "ds"], ["OP", "Opolskie", "op"], ["LD", "Łódzkie", "ld"], ["LU", "Lubelskie", "lu"],
  ["SL", "Śląskie", "sl"], ["SK", "Świętokrzyskie", "sk"], ["MP", "Małopolskie", "mp"], ["PK", "Podkarpackie", "pk"],
] as const;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Warsaw" }).format(value);
}

export function SecurityTrafficOverview({ protectedActivity, regionActivity, deviceActivity, polandVisits, foreignVisits, challengeAccountFound }: {
  protectedActivity: ProtectedActivity[];
  regionActivity: RegionActivity[];
  deviceActivity: DeviceActivity[];
  polandVisits: number;
  foreignVisits: number;
  challengeAccountFound: boolean;
}) {
  const critical = protectedActivity.filter((item) => item.severity === "critical");
  const byCode = new Map(regionActivity.map((item) => [item.code.toUpperCase().replace(/^PL-/, ""), item]));
  const maxRegion = Math.max(1, ...regionActivity.map((item) => item.visits));
  return <section className={`owner-security-overview ${critical.length ? "has-critical" : ""}`} aria-labelledby="owner-security-title">
    <header><div><span className="section-kicker">Prywatne centrum ochrony</span><h2 id="owner-security-title">Ruch i chronione operacje</h2><p>Sygnały są pseudonimizowane. Pokazują aktywność wymagającą uwagi, ale same nie są dowodem włamania.</p></div><span className={`owner-security-alert ${critical.length ? "critical" : "ready"}`}>{critical.length ? <><ShieldAlert aria-hidden="true" /> {critical.length} pilnych sygnałów</> : <><Radar aria-hidden="true" /> Brak pilnych sygnałów</>}</span></header>
    {critical.length ? <div className="owner-critical-banner" role="alert"><ShieldAlert aria-hidden="true" /><div><strong>Wykryto intensywne próby chronionej operacji</strong><p>Sprawdź poniższe wpisy, aktywne sesje i logi. Nie wyłączaj MFA ani limitów prób.</p></div></div> : null}
    <div className="owner-security-grid">
      <article className="owner-security-card"><header><MapPinned aria-hidden="true" /><div><span className="section-kicker">Przybliżona mapa Polski</span><h3>Skąd otwierano stronę</h3></div></header><div className="poland-traffic-summary"><strong>{polandVisits}</strong><span>wejść z Polski · {foreignVisits} spoza Polski</span></div><div className="poland-region-map" aria-label="Przybliżona liczba wejść według województwa">{regions.map(([code, name, area]) => { const visits = byCode.get(code)?.visits ?? 0; return <div key={code} style={{ gridArea: area, "--traffic": visits / maxRegion } as React.CSSProperties} className={visits ? "has-data" : undefined} title={`${name}: ${visits}`}><abbr title={name}>{code}</abbr><strong>{visits}</strong></div>; })}</div><p className="owner-security-note">Region pojawi się, gdy Cloudflare przekaże nagłówek województwa. Bez tej informacji system nie zgaduje lokalizacji.</p></article>
      <article className="owner-security-card"><header><ShieldAlert aria-hidden="true" /><div><span className="section-kicker">Ostatnie 24 godziny</span><h3>Próby chronionych operacji</h3></div></header><div className="protected-activity-list">{protectedActivity.length ? protectedActivity.slice(0, 12).map((item, index) => <div key={`${item.clientCode}-${item.lastAt.getTime()}-${index}`} className={`severity-${item.severity}`}><span><strong>{item.label}</strong><small>Klient {item.clientCode} · {formatDate(item.lastAt)}</small></span><b>{item.count} prób</b></div>) : <p>Brak zapisanych prób w bieżącym oknie ochrony.</p>}</div>{challengeAccountFound ? <p className="owner-critical-banner compact"><AlertTriangle aria-hidden="true" /><span>Wykryto konto o nazwie z publicznego wyzwania. Sprawdź je natychmiast w kartotekach i logach.</span></p> : <p className="owner-security-note">Konto z publicznego wyzwania nie istnieje. Rejestracja bez zaproszenia pozostaje zamknięta.</p>}</article>
      <article className="owner-security-card owner-device-card"><header><Smartphone aria-hidden="true" /><div><span className="section-kicker">Kategorie urządzeń</span><h3>Jak otwierano system</h3></div></header><div className="owner-device-bars">{deviceActivity.length ? deviceActivity.map((item) => <div key={item.label}><span>{item.label}</span><i><b style={{ width: `${Math.max(4, Math.min(100, item.visits / Math.max(1, deviceActivity[0]?.visits ?? 1) * 100))}%` }} /></i><strong>{item.visits}</strong></div>) : <p>Nowe dane pojawią się po wdrożeniu tej wersji.</p>}</div></article>
    </div>
  </section>;
}
