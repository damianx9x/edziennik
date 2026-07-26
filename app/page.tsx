"use client";

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
import { useSiteContent } from "../modules/site-content/site-content-provider";

const offerIcons = [MessagesSquare, School, BookOpenCheck, Globe2] as const;

export default function Home() {
  const { content } = useSiteContent();

  return (
    <main>
      <header className="site-header">
        <Brand />
        <nav className="desktop-nav" aria-label="Główna nawigacja">
          <a href="#zajecia">Zajęcia</a>
          <a href="#lokalizacje">Lokalizacje</a>
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
            <Sparkles size={16} aria-hidden="true" />
            {content.hero.eyebrow}
          </span>
          <h1>
            {content.hero.title}
            <span> {content.hero.accent}</span>
          </h1>
          <p className="hero-lead">{content.hero.description}</p>
          <div className="hero-actions">
            <Link
              className="button button-primary"
              href="/panel"
              data-testid="hero-panel-link"
            >
              {content.hero.primaryCta}
              <ArrowRight size={19} aria-hidden="true" />
            </Link>
            <a className="button button-secondary" href="#zajecia">
              {content.hero.secondaryCta}
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

        <HeroSlider slides={content.slides} />
      </section>

      <section className="proof-strip" aria-label="King’s Language Academy w skrócie">
        {content.proof.map((item) => (
          <div key={`${item.value}-${item.label}`}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="section offer-section" id="zajecia">
        <SectionHeading
          kicker={content.offer.kicker}
          title={content.offer.title}
          text={content.offer.text}
        />
        <div className="offer-grid">
          {content.offer.cards.map((item, index) => {
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
                  {item.detail}
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
          <span className="section-kicker">{content.story.kicker}</span>
          <h2>{content.story.title}</h2>
        </div>
        <div className="editorial-story-copy">
          <p>{content.story.text}</p>
          <a href={content.contact.facebookUrl} target="_blank" rel="noreferrer">
            {content.story.linkLabel} <ArrowRight aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="section locations-section" id="lokalizacje">
        <div className="locations-layout">
          <SectionHeading
            kicker={content.locations.kicker}
            title={content.locations.title}
            text={content.locations.text}
          />
          <div className="location-list">
            {content.locations.items.map((location) => (
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
            {content.digital.kicker}
          </span>
          <h2>{content.digital.title}</h2>
          <p>{content.digital.text}</p>
          <Link className="button button-red" href="/panel">
            {content.digital.cta} <ArrowRight size={19} aria-hidden="true" />
          </Link>
        </div>
        <div className="role-list">
          <Role
            number="01"
            icon={<HeartHandshake aria-hidden="true" />}
            title={content.digital.roles[0].title}
            text={content.digital.roles[0].text}
          />
          <Role
            number="02"
            icon={<GraduationCap aria-hidden="true" />}
            title={content.digital.roles[1].title}
            text={content.digital.roles[1].text}
          />
          <Role
            number="03"
            icon={<Users aria-hidden="true" />}
            title={content.digital.roles[2].title}
            text={content.digital.roles[2].text}
          />
          <Role
            number="04"
            icon={<ShieldCheck aria-hidden="true" />}
            title={content.digital.roles[3].title}
            text={content.digital.roles[3].text}
          />
        </div>
      </section>

      <section className="section core-modules-section" id="mozliwosci">
        <SectionHeading
          kicker={content.modules.kicker}
          title={content.modules.title}
          text={content.modules.text}
        />
        <div className="core-modules-grid">
          <CoreModule
            number="01"
            icon={<FileSignature aria-hidden="true" />}
            title={content.modules.cards[0].title}
            text={content.modules.cards[0].text}
            detail={content.modules.cards[0].detail}
          />
          <CoreModule
            number="02"
            icon={<MessagesSquare aria-hidden="true" />}
            title={content.modules.cards[1].title}
            text={content.modules.cards[1].text}
            detail={content.modules.cards[1].detail}
          />
          <CoreModule
            number="03"
            icon={<ReceiptText aria-hidden="true" />}
            title={content.modules.cards[2].title}
            text={content.modules.cards[2].text}
            detail={content.modules.cards[2].detail}
          />
          <CoreModule
            number="04"
            icon={<BookOpenCheck aria-hidden="true" />}
            title={content.modules.cards[3].title}
            text={content.modules.cards[3].text}
            detail={content.modules.cards[3].detail}
          />
        </div>
      </section>

      <section className="contact-section">
        <div>
          <span className="section-kicker">{content.contact.kicker}</span>
          <h2>{content.contact.title}</h2>
          <p>{content.contact.text}</p>
        </div>
        <div className="contact-actions">
          <a className="button button-primary" href={content.contact.phoneHref}>
            <Phone aria-hidden="true" /> {content.contact.phoneDisplay}
          </a>
          <a
            className="button button-secondary"
            href={`mailto:${content.contact.email}`}
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
        <Link href="/panel">eDziennik</Link>
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
