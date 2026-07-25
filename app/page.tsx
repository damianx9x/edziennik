import {
  ArrowRight,
  CalendarCheck,
  Check,
  Clock3,
  GraduationCap,
  HeartHandshake,
  LockKeyhole,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

const lessons = [
  ["14:30", "Young Explorers A1", "p. Marta · Sala Zielona", "mint"],
  ["16:00", "Teens B1", "p. Anna · Sala Słoneczna", "violet"],
  ["17:40", "Matura 2027", "p. Marta · Sala Zielona", "amber"],
] as const;

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Brand />
        <nav className="desktop-nav" aria-label="Główna nawigacja">
          <a href="#jak-to-dziala">Jak to działa</a>
          <a href="#dla-kogo">Dla kogo</a>
          <Link className="nav-panel-link" href="/panel">
            eDziennik <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </nav>
        <Link className="mobile-panel-link" href="/panel">
          eDziennik
        </Link>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={16} aria-hidden="true" /> Nowy eDziennik KLA
          </span>
          <h1>
            Więcej czasu na nauczanie.
            <span> Mniej na układanie grafiku.</span>
          </h1>
          <p className="hero-lead">
            Zajęcia, obecności i ważne wiadomości w jednym prostym miejscu —
            wygodnym na telefonie dla rodzica, ucznia i całej szkoły.
          </p>
          <div className="hero-actions">
            <Link
              className="button button-primary"
              href="/panel"
              data-testid="hero-panel-link"
            >
              Przejdź do eDziennika
              <ArrowRight size={19} aria-hidden="true" />
            </Link>
            <a className="button button-secondary" href="#jak-to-dziala">
              Zobacz, jak to działa
            </a>
          </div>
          <ul className="trust-list" aria-label="Najważniejsze zalety">
            <li>
              <Check aria-hidden="true" /> Prosto od pierwszego kliknięcia
            </li>
            <li>
              <Check aria-hidden="true" /> Zaprojektowane na telefon
            </li>
            <li>
              <Check aria-hidden="true" /> Dane chronione rolami
            </li>
          </ul>
        </div>

        <div className="schedule-visual" aria-label="Podgląd planu zajęć">
          <div className="orbit orbit-one" aria-hidden="true" />
          <div className="orbit orbit-two" aria-hidden="true" />
          <div className="schedule-card">
            <div className="schedule-header">
              <div>
                <span>Plan szkoły</span>
                <strong>Poniedziałek, 7 września</strong>
              </div>
              <span className="live-pill">3 zajęcia</span>
            </div>
            <div className="lesson-list">
              {lessons.map(([time, group, details, tone]) => (
                <article className={`lesson lesson-${tone}`} key={time}>
                  <time>{time}</time>
                  <div>
                    <strong>{group}</strong>
                    <span>{details}</span>
                  </div>
                  <ArrowRight size={18} aria-hidden="true" />
                </article>
              ))}
            </div>
            <div className="schedule-success">
              <CalendarCheck aria-hidden="true" />
              <span>
                <strong>Grafik bez kolizji</strong>
                Sale, grupy i wykładowcy sprawdzone
              </span>
            </div>
          </div>
          <div className="floating-note floating-top">
            <ShieldCheck aria-hidden="true" /> Bezpieczny dostęp
          </div>
          <div className="floating-note floating-bottom">
            <Clock3 aria-hidden="true" /> Oszczędzasz czas
          </div>
        </div>
      </section>

      <section className="value-strip" aria-label="Najważniejsze funkcje">
        <Feature
          icon={<CalendarCheck aria-hidden="true" />}
          title="Grafik bez kolizji"
          text="sala + grupa + wykładowca"
        />
        <Feature
          icon={<MessageCircleMore aria-hidden="true" />}
          title="Wiadomości w jednym miejscu"
          text="bez szukania w wielu aplikacjach"
        />
        <Feature
          icon={<LockKeyhole aria-hidden="true" />}
          title="Każdy widzi tylko swoje dane"
          text="uprawnienia sprawdzane na serwerze"
        />
      </section>

      <section className="section" id="jak-to-dziala">
        <SectionHeading
          kicker="Po prostu"
          title="Jedno miejsce, trzy codzienne kroki"
          text="Najczęstsze zadania mają być dostępne w maksymalnie trzech dotknięciach — bez instrukcji na trzydzieści stron."
        />
        <div className="steps-grid">
          <Step
            number="01"
            icon={<CalendarCheck aria-hidden="true" />}
            title="Sprawdź plan"
            text="Dziś, jutro albo cały tydzień — bez szukania w wiadomościach."
          />
          <Step
            number="02"
            icon={<Users aria-hidden="true" />}
            title="Zrób swoje"
            text="Obecność, zadanie lub zmiana sali dokładnie tam, gdzie jej potrzebujesz."
          />
          <Step
            number="03"
            icon={<HeartHandshake aria-hidden="true" />}
            title="Masz spokój"
            text="Właściwe osoby dostają informację, a szkoła ma czytelną historię."
          />
        </div>
      </section>

      <section className="section roles-section" id="dla-kogo">
        <SectionHeading
          light
          kicker="Dla każdego"
          title="Inny panel, ta sama prostota"
          text="Rodzic i uczeń nie oglądają zaplecza szkoły. Każdy dostaje widok dopasowany do swojej roli."
        />
        <div className="role-grid">
          <Role
            tone="coral"
            icon={<HeartHandshake aria-hidden="true" />}
            title="Rodzic"
            text="Plan dziecka, obecności, postępy i najważniejsze wiadomości."
          />
          <Role
            tone="mint"
            icon={<GraduationCap aria-hidden="true" />}
            title="Uczeń"
            text="Zajęcia, materiały i prace domowe w lekkim widoku na telefon."
          />
          <Role
            tone="amber"
            icon={<CalendarCheck aria-hidden="true" />}
            title="Szkoła"
            text="Grafik, grupy i dziennik dla dyrektora oraz wykładowców."
          />
        </div>
        <div className="role-cta">
          <div>
            <Sparkles aria-hidden="true" />
            <span>
              <strong>Coś wyjątkowego: Skarbiec Słówek</strong>
              Słówka z lekcji zmienią się w krótkie powtórki i czytelny postęp.
            </span>
          </div>
          <Link className="button button-light" href="/panel">
            Wybierz swój panel <ArrowRight size={19} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer>
        <Brand />
        <p>Wersja robocza · Etap 0 · wyłącznie dane demonstracyjne</p>
        <Link href="/panel">Przejdź do panelu</Link>
      </footer>
    </main>
  );
}

function Brand() {
  return (
    <Link className="brand" href="/" aria-label="KLA — strona główna">
      <span className="brand-mark" aria-hidden="true">
        K
      </span>
      <span>
        <strong>KLA</strong>
        <small>szkoła językowa</small>
      </span>
    </Link>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div>
      {icon}
      <span>
        <strong>{title}</strong>
        {text}
      </span>
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  text,
  light = false,
}: {
  kicker: string;
  title: string;
  text: string;
  light?: boolean;
}) {
  return (
    <div className={`section-heading ${light ? "heading-light" : ""}`}>
      <span className="section-kicker">{kicker}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function Step({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article>
      <span className="step-number">{number}</span>
      {icon}
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function Role({
  tone,
  icon,
  title,
  text,
}: {
  tone: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article>
      <div className={`role-icon role-${tone}`}>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
