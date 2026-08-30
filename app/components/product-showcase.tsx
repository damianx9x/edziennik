"use client";

import {
  Activity,
  ArrowRight,
  CalendarClock,
  DatabaseBackup,
  FileCheck2,
  Fingerprint,
  Gauge,
  MessagesSquare,
  Radar,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Link from "next/link";

const capabilities = [
  [CalendarClock, "Grafik bez kolizji", "Sala, wykładowca, grupa, dostępność ucznia i przejazd między lokalizacjami."],
  [MessagesSquare, "Komunikacja z kontekstem", "Rozmowy, ogłoszenia, załączniki, potwierdzenia i kontrolowane powiadomienia."],
  [FileCheck2, "Umowy i rozliczenia", "Wersjonowane dokumenty, ślad decyzji, raty i statusy bez ręcznego przepisywania danych."],
  [Activity, "Audyt każdej zmiany", "Pseudonimizowane wejścia, operacje biznesowe, alerty i filtry dla właściciela systemu."],
] as const;

export function ProductShowcase() {
  return <main className="product-showcase">
    <header className="product-showcase-nav"><Link href="/" className="product-mark"><span><Fingerprint aria-hidden="true" /></span><strong>eDziennik</strong><small>neutralny pokaz produktu</small></Link><nav aria-label="Nawigacja pokazu"><a href="#system">System</a><a href="#challenge">Bezpieczeństwo</a><Link className="button button-primary" href="/panel">Logowanie dla zaproszonych <ArrowRight aria-hidden="true" /></Link></nav></header>

    <section className="product-hero"><div className="product-hero-copy"><span className="eyebrow"><Radar aria-hidden="true" /> Neutralny pokaz technologii</span><h1>Realny system.<br /><span>Kontrolowana prezentacja.</span></h1><p>Architektura eDziennika uruchomiona na Raspberry Pi. Ta wizytówka nie reklamuje szkoły i nie pokazuje jej danych. Prawdziwy panel, baza, audyt oraz zabezpieczenia pozostają dostępne wyłącznie osobom zaproszonym.</p><div className="hero-actions"><Link className="button button-primary" href="/panel">Logowanie dla zaproszonych <ArrowRight aria-hidden="true" /></Link><a className="button button-secondary" href="#challenge">Zasady zgłaszania błędów</a></div><ul className="trust-list"><li><ShieldCheck aria-hidden="true" /> rejestracja bez zaproszenia zamknięta</li><li><DatabaseBackup aria-hidden="true" /> szyfrowane kopie i odtwarzanie</li><li><Smartphone aria-hidden="true" /> mobile-first</li></ul></div><aside className="product-system-card" aria-label="Stan architektury"><div className="product-radar"><Radar aria-hidden="true" /><i /><i /><i /></div><span className="section-kicker">Obserwowalność</span><h2>Zapisane operacje biznesowe zostawiają ślad</h2><div className="product-live-row"><span><i /> HTTPS i tunel</span><strong>online</strong></div><div className="product-live-row"><span><i /> Autoryzacja serwera</span><strong>fail closed</strong></div><div className="product-live-row"><span><i /> Pseudonimizowana telemetria</span><strong>aktywna</strong></div><small>Widok publiczny nie ujawnia surowych adresów IP, sekretów ani danych użytkowników.</small></aside></section>

    <section className="product-capabilities" id="system"><header><span className="section-kicker">Produkt, nie makieta</span><h2>Jeden workflow od planu do postępu ucznia</h2><p>Każdy moduł korzysta ze wspólnej kontroli ról, audytu i danych przypisanych do właściwej szkoły.</p></header><div>{capabilities.map(([Icon, title, text], index) => <article key={title}><span>0{index + 1}</span><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="product-challenge" id="challenge"><div><span className="section-kicker">Responsible security review</span><h2>Sprawdzaj publiczny interfejs. Chroń prawdziwe osoby.</h2><p>Nie prowadzimy otwartego środowiska włamań na danych szkoły. Jeśli zauważysz błąd na publicznej stronie albo granicy logowania, zatrzymaj test i zgłoś minimalny dowód prywatnie.</p></div><div className="product-challenge-grid"><article><ShieldCheck aria-hidden="true" /><strong>Dozwolone</strong><ul><li>ręczne, niskoczęstotliwościowe sprawdzanie publicznej wizytówki,</li><li>potwierdzenie, że rejestracja bez zaproszenia jest zamknięta,</li><li>prywatne zgłoszenie dowodu z minimalną ilością danych.</li></ul></article><article><Gauge aria-hidden="true" /><strong>Niedozwolone</strong><ul><li>DoS, masowe skanowanie i automatyczne zgadywanie haseł,</li><li>pobieranie, zmiana lub publikowanie cudzych danych,</li><li>utrzymywanie dostępu albo atak na infrastrukturę poza aplikacją.</li></ul></article></div><p className="product-challenge-note">Brak publicznego programu płatnych nagród. <a href="https://github.com/damianx9x/edziennik/security/policy" target="_blank" rel="noreferrer">Pełne zasady bezpieczeństwa</a> · zgłoszenia: <a href="mailto:damianx9x@me.com">damianx9x@me.com</a>.</p></section>

    <footer className="product-footer"><span><Fingerprint aria-hidden="true" /> eDziennik · otwarty kod AGPL-3.0</span><p>Projekt i rozwój: Damian Eron · dane szkoły ukryte w tym trybie</p><a href="https://github.com/damianx9x/edziennik" target="_blank" rel="noreferrer">Kod i dokumentacja techniczna <ArrowRight aria-hidden="true" /></a></footer>
  </main>;
}
