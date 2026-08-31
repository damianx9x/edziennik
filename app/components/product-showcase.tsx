"use client";

import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  DatabaseBackup,
  FileCheck2,
  Fingerprint,
  Gauge,
  GraduationCap,
  MessagesSquare,
  Radar,
  School,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const capabilities = [
  [CalendarClock, "Grafik bez kolizji", "Sala, wykładowca, grupa, dostępność ucznia i przejazd między lokalizacjami."],
  [MessagesSquare, "Komunikacja z kontekstem", "Rozmowy, ogłoszenia, załączniki, potwierdzenia i kontrolowane powiadomienia."],
  [FileCheck2, "Umowy i rozliczenia", "Wersjonowane dokumenty, ślad decyzji, raty i statusy bez ręcznego przepisywania danych."],
  [Activity, "Audyt każdej zmiany", "Pseudonimizowane wejścia, operacje biznesowe, alerty i filtry dla właściciela systemu."],
] as const;

const roleDemos = {
  director: {
    label: "Dyrektor", icon: School, title: "Centrum decyzji całej szkoły",
    description: "W jednym widoku sprawy wymagające reakcji, dzisiejsze zajęcia, umowy i stan systemu.",
    metrics: [["Dzisiaj", "8 zajęć"], ["Do decyzji", "3 sprawy"], ["Grafik", "bez kolizji"]],
    tasks: ["Zatwierdź zmianę wykładowcy", "Sprawdź umowę oczekującą na podpis", "Odczytaj alert kopii zapasowej"],
  },
  teacher: {
    label: "Wykładowca", icon: Users, title: "Najbliższa lekcja i szybka obecność",
    description: "Plan, materiały, zadania i dostępność bez administracyjnego przeładowania.",
    metrics: [["Następna lekcja", "16:30"], ["Grupa", "A2 · 8 osób"], ["Sala", "Główna"]],
    tasks: ["Uzupełnij obecność po zajęciach", "Dodaj materiał dla grupy", "Zgłoś propozycję zmiany grafiku"],
  },
  parent: {
    label: "Rodzic", icon: Smartphone, title: "Wszystko dotyczące własnego dziecka",
    description: "Plan, wiadomości, dokumenty i rozliczenia — bez dostępu do danych innych rodzin.",
    metrics: [["Najbliższe zajęcia", "jutro 17:00"], ["Umowa", "do akceptacji"], ["Rata", "do 10 września"]],
    tasks: ["Otwórz plan dziecka", "Przeczytaj wiadomość od szkoły", "Sprawdź dokument przed decyzją"],
  },
  student: {
    label: "Uczeń", icon: GraduationCap, title: "Nauka bez zbędnych formalności",
    description: "Uczeń widzi wyłącznie swój plan, materiały, zadania i postępy — bez umów i płatności.",
    metrics: [["Najbliższe zajęcia", "jutro 17:00"], ["Zadanie", "1 do zrobienia"], ["Postęp", "+8% w miesiącu"]],
    tasks: ["Otwórz materiał z ostatniej lekcji", "Wyślij zadanie", "Sprawdź własny postęp"],
  },
} as const;

type DemoRole = keyof typeof roleDemos;

const workflow = [
  ["01", "Kartoteki", "Relacje rodzin, grup, wykładowców, sal i lokalizacji."],
  ["02", "Grafik", "Ręczne planowanie albo propozycja automatyczna bez kolizji."],
  ["03", "Lekcja", "Obecność, materiał, zadanie oraz historia zmian."],
  ["04", "Kontakt", "Rozmowa, ogłoszenie, załącznik i potwierdzenie odczytu."],
  ["05", "Formalności", "Umowa, kosztorys, harmonogram i ręczny status płatności."],
  ["06", "Postępy", "Obserwacje wykładowcy i czytelny rozwój umiejętności."],
] as const;

export function ProductShowcase() {
  const [activeRole, setActiveRole] = useState<DemoRole>("director");
  const role = roleDemos[activeRole];
  const RoleIcon = role.icon;

  return <main className="product-showcase">
    <header className="product-showcase-nav"><Link href="/" className="product-mark"><span><Fingerprint aria-hidden="true" /></span><strong>eDziennik</strong><small>neutralny pokaz produktu</small></Link><nav aria-label="Nawigacja pokazu"><a href="#system">System</a><a href="#role-demo">Widoki ról</a><a href="#security">Bezpieczeństwo</a><Link className="button button-primary" href="/panel">Logowanie dla zaproszonych <ArrowRight aria-hidden="true" /></Link></nav></header>

    <section className="product-hero"><div className="product-hero-copy"><span className="eyebrow"><Radar aria-hidden="true" /> Neutralny pokaz technologii</span><h1>Realny system.<br /><span>Jasne zasady.</span></h1><p>Kompletny eDziennik dla małej szkoły językowej, uruchomiony na własnym serwerze. Ten pokaz używa wyłącznie przykładowych treści i nie ujawnia nazwy, zdjęć, kontaktów ani danych operacyjnych klienta.</p><div className="hero-actions"><a className="button button-primary" href="#role-demo">Zobacz możliwości <ArrowRight aria-hidden="true" /></a><Link className="button button-secondary" href="/panel">Mam zaproszenie</Link></div><ul className="trust-list"><li><ShieldCheck aria-hidden="true" /> rejestracja bez zaproszenia zamknięta</li><li><DatabaseBackup aria-hidden="true" /> szyfrowane kopie i test odtworzenia</li><li><Smartphone aria-hidden="true" /> mobile-first dla każdej roli</li></ul></div><aside className="product-system-card" aria-label="Stan architektury"><div className="product-radar"><Radar aria-hidden="true" /><i /><i /><i /></div><span className="section-kicker">Obserwowalność</span><h2>Zapisane operacje biznesowe zostawiają ślad</h2><div className="product-live-row"><span><i /> HTTPS i prywatny tunel</span><strong>online</strong></div><div className="product-live-row"><span><i /> Autoryzacja na serwerze</span><strong>fail closed</strong></div><div className="product-live-row"><span><i /> Izolacja danych szkoły</span><strong>schoolId</strong></div><small>Widok publiczny nie pokazuje surowych adresów IP, sekretów ani danych użytkowników.</small></aside></section>

    <section className="product-capabilities" id="system"><header><span className="section-kicker">Produkt, nie makieta</span><h2>Jeden workflow od planu do postępu ucznia</h2><p>Każdy moduł korzysta ze wspólnej kontroli ról, audytu i danych przypisanych do właściwej szkoły.</p></header><div>{capabilities.map(([Icon, title, text], index) => <article key={title}><span>0{index + 1}</span><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="product-role-demo" id="role-demo" aria-labelledby="role-demo-title">
      <header><span className="section-kicker">Przykładowe dane</span><h2 id="role-demo-title">Inny dzień pracy dla każdej roli</h2><p>Wybierz rolę. Podgląd niczego nie zapisuje i nie łączy się z kartotekami szkoły.</p></header>
      <div className="product-role-tabs" role="tablist" aria-label="Wybierz rolę do prezentacji">
        {(Object.entries(roleDemos) as Array<[DemoRole, (typeof roleDemos)[DemoRole]]>).map(([key, item]) => { const Icon = item.icon; return <button key={key} type="button" role="tab" aria-selected={activeRole === key} aria-controls="product-role-panel" id={`product-role-${key}`} onClick={() => setActiveRole(key)}><Icon aria-hidden="true" />{item.label}</button>; })}
      </div>
      <div className="product-role-panel" id="product-role-panel" role="tabpanel" aria-labelledby={`product-role-${activeRole}`} tabIndex={0}>
        <div className="product-role-heading"><span><RoleIcon aria-hidden="true" /></span><div><small>Przykładowe dane · {role.label}</small><h3>{role.title}</h3><p>{role.description}</p></div></div>
        <div className="product-role-metrics">{role.metrics.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
        <div className="product-role-tasks"><strong>Najważniejsze teraz</strong><ul>{role.tasks.map((task) => <li key={task}><CheckCircle2 aria-hidden="true" />{task}</li>)}</ul></div>
      </div>
    </section>

    <section className="product-workflow" aria-labelledby="workflow-title"><header><span className="section-kicker">Spójny przepływ</span><h2 id="workflow-title">Informację wpisujesz raz</h2><p>Powiązania z kartoteki wspierają grafik, lekcję, komunikację, umowy i raporty.</p></header><div>{workflow.map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="product-operations" aria-labelledby="operations-title"><div><span className="section-kicker">Własny serwer, kontrolowane wydania</span><h2 id="operations-title">Dane zostają pod kontrolą właściciela</h2><p>PostgreSQL i prywatne pliki pozostają poza paczką kodu. Przed wdrożeniem serwer tworzy szyfrowaną kopię, sprawdza możliwość jej odtworzenia, a potem stosuje wyłącznie kontrolowane migracje.</p></div><ul><li><DatabaseBackup aria-hidden="true" /><span><strong>Kopia przed aktualizacją</strong><small>Automatyczny test odtworzenia sprawdza, czy kopia jest użyteczna.</small></span></li><li><ShieldCheck aria-hidden="true" /><span><strong>Podpisana paczka</strong><small>Serwer odrzuca wydanie bez zgodnego podpisu i manifestu plików.</small></span></li><li><BookOpenCheck aria-hidden="true" /><span><strong>Rollback kodu</strong><small>Jeżeli zdrowie aplikacji nie przejdzie kontroli, wraca poprzedni kod.</small></span></li></ul></section>

    <section className="product-challenge" id="security"><div><span className="section-kicker">Responsible security review</span><h2>Sprawdzaj publiczny interfejs. Chroń prawdziwe osoby.</h2><p>To nie jest otwarte laboratorium włamań na danych szkoły. Jeśli zauważysz błąd na publicznej stronie albo granicy logowania, zatrzymaj test i zgłoś minimalny dowód prywatnie.</p></div><div className="product-challenge-grid"><article><ShieldCheck aria-hidden="true" /><strong>Dozwolone</strong><ul><li>ręczne, niskoczęstotliwościowe sprawdzanie publicznej wizytówki,</li><li>potwierdzenie, że rejestracja bez zaproszenia jest zamknięta,</li><li>prywatne zgłoszenie dowodu z minimalną ilością danych.</li></ul></article><article><Gauge aria-hidden="true" /><strong>Niedozwolone</strong><ul><li>DoS, masowe skanowanie i automatyczne zgadywanie haseł,</li><li>pobieranie, zmiana lub publikowanie cudzych danych,</li><li>utrzymywanie dostępu albo atak na infrastrukturę poza aplikacją.</li></ul></article></div><p className="product-challenge-note">Brak publicznego programu płatnych nagród. <a href="https://github.com/damianx9x/edziennik/security/policy" target="_blank" rel="noreferrer">Pełne zasady bezpieczeństwa</a> · zgłoszenia: <a href="mailto:damianx9x@me.com">damianx9x@me.com</a>.</p></section>

    <footer className="product-footer"><span><Fingerprint aria-hidden="true" /> eDziennik · otwarty kod AGPL-3.0</span><p>Projekt i rozwój: Damian Eron · dane szkoły ukryte w tym trybie</p><a href="https://github.com/damianx9x/edziennik" target="_blank" rel="noreferrer">Kod i dokumentacja techniczna <ArrowRight aria-hidden="true" /></a></footer>
  </main>;
}
