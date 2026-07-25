import {
  ArrowRight,
  BookOpenCheck,
  Check,
  FileSignature,
  GraduationCap,
  Globe2,
  HeartHandshake,
  MapPin,
  MessageCircleMore,
  MessagesSquare,
  Phone,
  ReceiptText,
  School,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Brand } from "./components/brand";
import { HeroSlider } from "./components/hero-slider";
import {
  klaBrand,
  klaLocations,
  klaOffer,
} from "../modules/brand/content";

const offerIcons = [MessagesSquare, School, BookOpenCheck, Globe2] as const;

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Brand />
        <nav className="desktop-nav" aria-label="Główna nawigacja">
          <a href="#zajecia">Zajęcia</a>
          <a href="#lokalizacje">Lokalizacje</a>
          <a href="#jak-to-dziala">eDziennik</a>
          <Link className="nav-panel-link" href="/panel">
            Otwórz panel <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </nav>
        <Link className="mobile-panel-link" href="/panel">
          eDziennik
        </Link>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={16} aria-hidden="true" />
            King’s Language Academy
          </span>
          <h1>
            Nauka, która
            <span> dodaje odwagi.</span>
          </h1>
          <p className="hero-lead">
            Prywatna szkoła języka angielskiego dla dzieci i młodzieży.
            Kameralne grupy, dużo mówienia i zajęcia, na które chce się wracać
            — blisko domu i online.
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
            <a className="button button-secondary" href="#zajecia">
              Poznaj KLA
            </a>
          </div>
          <ul className="trust-list" aria-label="Najważniejsze zalety">
            <li>
              <Check aria-hidden="true" /> Małe grupy 2–8 osób
            </li>
            <li>
              <Check aria-hidden="true" /> Stacjonarnie i online
            </li>
            <li>
              <Check aria-hidden="true" /> Nauka przez działanie
            </li>
          </ul>
        </div>

        <HeroSlider />
      </section>

      <section className="proof-strip" aria-label="King’s Language Academy w skrócie">
        <div>
          <strong>2–8</strong>
          <span>osób w grupie</span>
        </div>
        <div>
          <strong>8+</strong>
          <span>lokalizacji i online</span>
        </div>
        <div>
          <strong>100%</strong>
          <span>poleceń na profilu KLA</span>
        </div>
        <div>
          <strong>1</strong>
          <span>prosty eDziennik</span>
        </div>
      </section>

      <section className="section offer-section" id="zajecia">
        <SectionHeading
          kicker="Tylko angielski. Naprawdę dobrze."
          title="Jedna specjalizacja, wiele sposobów na postęp"
          text="KLA koncentruje się wyłącznie na języku angielskim. Mówienie, rozumienie, czytanie i pisanie rozwijają się razem, w tempie dopasowanym do wieku i potrzeb grupy."
        />
        <div className="offer-grid">
          {klaOffer.map((item, index) => {
            const Icon = offerIcons[index];
            return (
              <article className={`offer-card offer-${item.tone}`} key={item.title}>
                <div className="offer-card-top">
                  <span>{item.eyebrow}</span>
                  <Icon aria-hidden="true" />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className="offer-more">
                  Program dopasowany do grupy
                </span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="editorial-story">
        <span className="editorial-number" aria-hidden="true">
          01
        </span>
        <div>
          <span className="section-kicker">Język w prawdziwym świecie</span>
          <h2>Angielski nie kończy się na ostatniej stronie podręcznika.</h2>
        </div>
        <div className="editorial-story-copy">
          <p>
            W KLA rozmowa, kultura i wspólne doświadczenia są częścią nauki.
            Dzięki temu dzieci nie tylko znają odpowiedź — mają też odwagę, by
            powiedzieć ją po angielsku.
          </p>
          <a href={klaBrand.facebookUrl} target="_blank" rel="noreferrer">
            Zobacz życie szkoły <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="section locations-section" id="lokalizacje">
        <div className="locations-layout">
          <SectionHeading
            kicker="KLA jest blisko"
            title="Spotkajmy się na Pomorzu albo online"
            text="Wybierz wygodną lokalizację. Aktualny grafik i dostępność miejsc potwierdzi zespół szkoły."
          />
          <div className="location-list">
            {klaLocations.map((location) => (
              <span key={location}>
                <MapPin aria-hidden="true" /> {location}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="digital-section" id="jak-to-dziala">
        <div className="digital-intro">
          <span className="section-kicker section-kicker-light">
            Cyfrowe zaplecze, ludzkie podejście
          </span>
          <h2>Jedno proste miejsce dla całej społeczności KLA.</h2>
          <p>
            Rodzic, uczeń, wykładowca i dyrektor widzą tylko to, czego potrzebują.
            Plan, obecności i najważniejsze informacje są pod ręką — szczególnie
            na telefonie.
          </p>
          <Link className="button button-red" href="/panel">
            Wybierz swój panel <ArrowRight size={19} aria-hidden="true" />
          </Link>
        </div>
        <div className="role-list">
          <Role
            number="01"
            icon={<HeartHandshake aria-hidden="true" />}
            title="Rodzic"
            text="Plan dziecka, obecności, postępy i ważne wiadomości bez szukania w czatach."
          />
          <Role
            number="02"
            icon={<GraduationCap aria-hidden="true" />}
            title="Uczeń"
            text="Najbliższe zajęcia, materiały i zadania w lekkim widoku na telefon."
          />
          <Role
            number="03"
            icon={<Users aria-hidden="true" />}
            title="Wykładowca"
            text="Dzisiejsze grupy, szybka obecność i komunikacja z właściwymi osobami."
          />
          <Role
            number="04"
            icon={<ShieldCheck aria-hidden="true" />}
            title="Dyrektor"
            text="Grafik, grupy i spokojna kontrola działania szkoły w jednym miejscu."
          />
        </div>
      </section>

      <section className="section core-modules-section" id="mozliwosci">
        <SectionHeading
          kicker="W pierwszej wersji"
          title="Najważniejsze sprawy szkoły. W jednym spokojnym miejscu."
          text="Panel ma zdejmować pracę z głowy, a nie dokładać kolejny system do obsługi. Każdy moduł prowadzi użytkownika jednym czytelnym przepływem."
        />
        <div className="core-modules-grid">
          <CoreModule
            number="01"
            icon={<FileSignature aria-hidden="true" />}
            title="Umowy online"
            text="Przypisanie umowy, niezmienna wersja PDF, bezpieczna akceptacja i komplet dowodów."
            detail="Rodzic · Dyrektor"
          />
          <CoreModule
            number="02"
            icon={<MessagesSquare aria-hidden="true" />}
            title="Komunikator i ogłoszenia"
            text="Rozmowy grupowe, wiadomości służbowe i wysyłka informacji do całej wybranej grupy."
            detail="Grupy · E-mail"
          />
          <CoreModule
            number="03"
            icon={<ReceiptText aria-hidden="true" />}
            title="Status płatności"
            text="Dyrektor ręcznie oznacza status, a rodzic widzi prostą i aktualną informację."
            detail="Bez płatności online"
          />
          <CoreModule
            number="04"
            icon={<BookOpenCheck aria-hidden="true" />}
            title="Materiały i zadania"
            text="Materiały dla grupy, termin zadania i czytelny monitoring oddania bez szukania w czatach."
            detail="Wykładowca · Uczeń"
          />
        </div>
      </section>

      <section className="contact-section">
        <div>
          <span className="section-kicker">Masz pytanie?</span>
          <h2>Porozmawiajmy o najlepszym starcie.</h2>
          <p>
            Napisz lub zadzwoń. Zespół KLA pomoże dobrać zajęcia, lokalizację i
            grupę odpowiednią dla dziecka.
          </p>
        </div>
        <div className="contact-actions">
          <a className="button button-primary" href={klaBrand.phoneHref}>
            <Phone aria-hidden="true" /> {klaBrand.phoneDisplay}
          </a>
          <a
            className="button button-secondary"
            href={`mailto:${klaBrand.supportEmail}`}
          >
            <MessageCircleMore aria-hidden="true" /> Napisz do KLA
          </a>
        </div>
      </section>

      <footer>
        <Brand />
        <p>
          Wersja pilotażowa eDziennika · dane demonstracyjne · treści robocze do
          akceptacji KLA
        </p>
        <Link href="/panel">Przejdź do panelu</Link>
      </footer>
    </main>
  );
}

function SectionHeading({
  kicker,
  title,
  text,
}: {
  kicker: string;
  title: string;
  text: string;
}) {
  return (
    <div className="section-heading">
      <span className="section-kicker">{kicker}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function Role({
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
    <article className="role-row">
      <span className="role-number">{number}</span>
      <div className="role-icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <ArrowRight aria-hidden="true" />
    </article>
  );
}

function CoreModule({
  number,
  icon,
  title,
  text,
  detail,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  detail: string;
}) {
  return (
    <article className="core-module">
      <div className="core-module-top">
        <span>{number}</span>
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <small>{detail}</small>
    </article>
  );
}
