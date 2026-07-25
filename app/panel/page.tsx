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

import { Brand } from "../components/brand";

export const metadata: Metadata = { title: "Wybierz panel" };

const portals = [
  {
    slug: "uczen",
    title: "Uczeń",
    text: "Najbliższe zajęcia, materiały i zadania — bez przeklikiwania się przez szkolne menu.",
    icon: GraduationCap,
  },
  {
    slug: "rodzic",
    title: "Rodzic",
    text: "Plan i najważniejsze informacje o dziecku zawsze pod ręką.",
    icon: HeartHandshake,
  },
  {
    slug: "szkola",
    title: "Szkoła",
    text: "Grafik i dziennik dla dyrektora oraz wykładowców KLA.",
    icon: Building2,
  },
] as const;

export default function PanelPage() {
  return (
    <main className="panel-shell">
      <PanelTopbar />
      <section className="panel-content">
        <div className="panel-heading">
          <span className="section-kicker">eDziennik King’s</span>
          <h1>Jak chcesz wejść?</h1>
          <p>
            Wybierz swój panel. Każdy widok jest krótki, czytelny i dopasowany
            do tego, co robisz w KLA.
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

function PanelTopbar() {
  return (
    <div className="panel-topbar">
      <Brand compact />
      <Link className="back-link" href="/">
        <ArrowLeft size={18} aria-hidden="true" /> Strona szkoły
      </Link>
    </div>
  );
}
