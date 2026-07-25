import {
  ArrowLeft,
  ArrowRight,
  Building2,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Wybierz panel" };

const portals = [
  {
    slug: "uczen",
    title: "Uczeń",
    text: "Plan zajęć, materiały i prace domowe w prostym widoku na telefon.",
    icon: GraduationCap,
  },
  {
    slug: "rodzic",
    title: "Rodzic",
    text: "Najważniejsze informacje o dziecku bez szukania w wiadomościach.",
    icon: HeartHandshake,
  },
  {
    slug: "szkola",
    title: "Szkoła",
    text: "Logowanie dyrektora i wykładowcy do grafiku oraz dziennika.",
    icon: Building2,
  },
] as const;

export default function PanelPage() {
  return (
    <main className="panel-shell">
      <PanelTopbar />
      <section className="panel-content">
        <div className="panel-heading">
          <span className="section-kicker">Witaj w eDzienniku</span>
          <h1>Jak chcesz wejść?</h1>
          <p>
            Wybierz swój panel. Na następnym ekranie zobaczysz tylko informacje
            potrzebne w Twojej roli.
          </p>
        </div>
        <div className="portal-grid">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <Link
                className="portal-card"
                href={`/panel/logowanie?rola=${portal.slug}`}
                key={portal.slug}
                data-testid={`portal-${portal.slug}`}
              >
                <Icon aria-hidden="true" />
                <h2>{portal.title}</h2>
                <p>{portal.text}</p>
                <span>
                  Wybieram <ArrowRight size={18} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
        <p className="privacy-note">
          <ShieldCheck aria-hidden="true" />
          Każde konto otrzyma osobne uprawnienia. Rodzic nie zobaczy danych
          innego dziecka, a wykładowca — grup, których nie prowadzi.
        </p>
      </section>
    </main>
  );
}

export function PanelTopbar() {
  return (
    <div className="panel-topbar">
      <Link className="brand" href="/">
        <span className="brand-mark" aria-hidden="true">
          K
        </span>
        <span>
          <strong>KLA</strong>
          <small>eDziennik</small>
        </span>
      </Link>
      <Link className="back-link" href="/">
        <ArrowLeft size={18} aria-hidden="true" /> Strona szkoły
      </Link>
    </div>
  );
}
