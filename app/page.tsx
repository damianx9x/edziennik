"use client";

import {
  ArrowRight,
  Award,
  BookOpenCheck,
  CalendarClock,
  Camera,
  Check,
  CircleHelp,
  Clock3,
  Compass,
  FileSignature,
  GraduationCap,
  Globe2,
  HeartHandshake,
  Info,
  Lightbulb,
  Link2,
  MapPin,
  MapPinned,
  MessageCircleMore,
  MessagesSquare,
  Phone,
  ReceiptText,
  Quote,
  School,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  UserRound,
  UserRoundCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Brand } from "./components/brand";
import { HeroSlider } from "./components/hero-slider";
import { ProductShowcase } from "./components/product-showcase";
import { useSiteContent } from "../modules/site-content/site-content-provider";
import type { SiteContent } from "../modules/site-content/schema";

const offerIcons = [MessagesSquare, School, BookOpenCheck, Globe2] as const;

export default function Home() {
  const { content, isReady, publicMode } = useSiteContent();

  if (!isReady)
    return (
      <main className="public-mode-loading" aria-label="Wczytywanie strony">
        <span />
      </main>
    );
  if (publicMode === "PRODUCT") return <ProductShowcase />;

  return (
    <main
      className={`public-site site-width-${content.layout.contentWidth} site-corners-${content.layout.cornerStyle}`}
    >
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

      <section className={`hero hero-${content.slider.layout} hero-scale-${content.layout.heroScale}`}>
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

        <HeroSlider
          slides={content.slides}
          imageFit={content.slider.imageFit}
        />
      </section>

      <section className="proof-strip" aria-label="Szkoła językowa w skrócie">
        {content.proof.map((item) => (
          <div key={`${item.value}-${item.label}`}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <HomeSections content={content} />

      <footer>
        <Brand />
        <p>
          Publiczna wizytówka szkoły · panel dostępny wyłącznie po zalogowaniu
          <br />
          System zaprojektował Damian Eron · damianx9x@me.com
        </p>
        <Link href="/panel">eDziennik</Link>
      </footer>
    </main>
  );
}

function HomeSections({ content }: { content: SiteContent }) {
  return content.layout.sections
    .filter((section) => section.visible)
    .map((layout) => (
      <div
        className={`home-layout-block home-layout-${layout.width} home-spacing-${layout.spacing}`}
        key={layout.id}
      >
        <HomeSection id={layout.id} content={content} />
      </div>
    ));
}

function HomeSection({
  id,
  content,
}: {
  id: SiteContent["layout"]["sections"][number]["id"];
  content: SiteContent;
}) {
  if (id === "offer") {
    return (
      <section className="section offer-section" id="zajecia">
        <SectionHeading kicker={content.offer.kicker} title={content.offer.title} text={content.offer.text} />
        <div className="offer-grid">
          {content.offer.cards.map((item, index) => {
            const Icon = offerIcons[index];
            return (
              <article className={`offer-card offer-${item.tone}`} key={item.title}>
                <div className="offer-card-top"><span>{item.eyebrow}</span><Icon aria-hidden="true" /></div>
                <h3>{item.title}</h3><p>{item.text}</p><span className="offer-more">{item.detail}</span>
              </article>
            );
          })}
        </div>
      </section>
    );
  }
  if (id === "story") {
    return (
      <section className="editorial-story">
        <span className="editorial-number" aria-hidden="true">01</span>
        <div><span className="section-kicker">{content.story.kicker}</span><h2>{content.story.title}</h2></div>
        <div className="editorial-story-copy">
          <p>{content.story.text}</p>
          <a href={content.contact.facebookUrl} target="_blank" rel="noreferrer">{content.story.linkLabel} <ArrowRight aria-hidden="true" /></a>
        </div>
      </section>
    );
  }
  if (id === "locations") {
    return (
      <section className="section locations-section" id="lokalizacje">
        <div className="locations-layout">
          <SectionHeading kicker={content.locations.kicker} title={content.locations.title} text={content.locations.text} />
          <div className="location-list">{content.locations.items.map((location) => <span key={location}><MapPin aria-hidden="true" /> {location}</span>)}</div>
        </div>
      </section>
    );
  }
  if (id === "digital") {
    return (
      <section className="digital-section" id="jak-to-dziala">
        <div className="digital-intro">
          <span className="section-kicker section-kicker-light">{content.digital.kicker}</span>
          <h2>{content.digital.title}</h2><p>{content.digital.text}</p>
          <Link className="button button-red" href="/panel">{content.digital.cta} <ArrowRight size={19} aria-hidden="true" /></Link>
        </div>
        <div className="role-list">
          <Role number="01" icon={<HeartHandshake aria-hidden="true" />} title={content.digital.roles[0].title} text={content.digital.roles[0].text} />
          <Role number="02" icon={<GraduationCap aria-hidden="true" />} title={content.digital.roles[1].title} text={content.digital.roles[1].text} />
          <Role number="03" icon={<Users aria-hidden="true" />} title={content.digital.roles[2].title} text={content.digital.roles[2].text} />
          <Role number="04" icon={<ShieldCheck aria-hidden="true" />} title={content.digital.roles[3].title} text={content.digital.roles[3].text} />
        </div>
      </section>
    );
  }
  if (id === "modules") {
    const icons = [FileSignature, MessagesSquare, ReceiptText, BookOpenCheck] as const;
    return (
      <section className="section core-modules-section" id="mozliwosci">
        <SectionHeading kicker={content.modules.kicker} title={content.modules.title} text={content.modules.text} />
        <div className="core-modules-grid">
          {content.modules.cards.map((card, index) => {
            const Icon = icons[index];
            return <CoreModule key={card.title} number={`0${index + 1}`} icon={<Icon aria-hidden="true" />} title={card.title} text={card.text} detail={card.detail} />;
          })}
        </div>
      </section>
    );
  }
  if (id === "widgets") {
    const icons = {
      highlight: Lightbulb,
      stat: Sparkles,
      link: Link2,
      notice: Info,
      testimonial: Quote,
      enrollment: UserRoundCheck,
      course: BookOpenCheck,
      teacher: UserRound,
      event: CalendarClock,
      location: MapPinned,
      faq: CircleHelp,
      gallery: Camera,
      schedule: Clock3,
      benefit: Star,
      social: MessagesSquare,
      availability: Compass,
      method: Target,
      progress: Trophy,
      trust: Award,
    } as const;
    return (
      <section className="section home-widgets-section" aria-label="Ważne informacje">
        <div className="home-widgets-grid">
          {content.widgets.map((widget) => {
            const Icon = icons[widget.type];
            const external = widget.href.startsWith("http");
            return (
              <article
                className={`home-widget home-widget-${widget.size} home-widget-${widget.tone} home-widget-surface-${widget.surface ?? "solid"} home-widget-border-${widget.borderStyle ?? "accent"} home-widget-blend-${widget.blend ?? "normal"}`}
                data-widget-type={widget.type}
                key={widget.id}
                style={{ "--widget-opacity": Number(widget.opacity ?? "100") / 100 } as React.CSSProperties}
              >
                <div className="home-widget-top"><span>{widget.badge}</span><Icon aria-hidden="true" /></div>
                <h2>{widget.title}</h2><p>{widget.text}</p>
                <a href={widget.href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{widget.actionLabel} <ArrowRight aria-hidden="true" /></a>
              </article>
            );
          })}
        </div>
      </section>
    );
  }
  return (
    <section className="contact-section" id="kontakt">
      <div><span className="section-kicker">{content.contact.kicker}</span><h2>{content.contact.title}</h2><p>{content.contact.text}</p></div>
      <div className="contact-actions">
        <a className="button button-primary" href={content.contact.phoneHref}><Phone aria-hidden="true" /> {content.contact.phoneDisplay}</a>
        <a className="button button-secondary" href={`mailto:${content.contact.email}`}><MessageCircleMore aria-hidden="true" /> Napisz do szkoły</a>
      </div>
    </section>
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
