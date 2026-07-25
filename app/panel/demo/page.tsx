import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileSignature,
  MapPin,
  MessagesSquare,
  MoreHorizontal,
  ReceiptText,
  Search,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "../../components/brand";
import {
  demoGroups,
  demoStudentCount,
} from "../../../modules/demo-data/groups";

export const metadata: Metadata = { title: "Panel demonstracyjny" };

const todayLessons = [
  { time: "14:20", groupId: "toronto-2d", room: "Sala Cambridge" },
  { time: "15:45", groupId: "barcelona-3", room: "Sala Barcelona" },
  { time: "17:10", groupId: "monaco-8", room: "Sala Oxford" },
] as const;

const schoolModules = [
  {
    icon: FileSignature,
    title: "Umowy",
    value: "12",
    detail: "oczekuje na akceptację",
    action: "Sprawdź umowy",
    tone: "red",
  },
  {
    icon: MessagesSquare,
    title: "Wiadomości",
    value: "3",
    detail: "nowe rozmowy",
    action: "Otwórz skrzynkę",
    tone: "blue",
  },
  {
    icon: ReceiptText,
    title: "Płatności",
    value: "5",
    detail: "statusów do sprawdzenia",
    action: "Oznacz status",
    tone: "gold",
  },
  {
    icon: BookOpenCheck,
    title: "Zadania",
    value: "4",
    detail: "aktywne w grupach",
    action: "Zobacz monitoring",
    tone: "green",
  },
] as const;

export default function DemoDashboardPage() {
  return (
    <main className="demo-shell">
      <header className="demo-topbar">
        <Brand compact />
        <div className="demo-topbar-actions">
          <span>Tryb demonstracyjny</span>
          <Link className="back-link" href="/panel">
            <ArrowLeft aria-hidden="true" /> Zmień panel
          </Link>
        </div>
      </header>

      <div className="demo-layout">
        <aside className="demo-sidebar" aria-label="Nawigacja panelu">
          <nav>
            <a className="active" href="#dzisiaj">
              <CalendarDays aria-hidden="true" /> Dzisiaj
            </a>
            <a href="#grupy">
              <Users aria-hidden="true" /> Grupy
            </a>
            <a href="#grupy">
              <Clock3 aria-hidden="true" /> Grafik
            </a>
            <a href="#centrum">
              <MoreHorizontal aria-hidden="true" /> Więcej
            </a>
          </nav>
          <div className="sidebar-note">
            <strong>Dane bezpieczne</strong>
            <span>Wyłącznie nazwy grup i syntetyczne informacje.</span>
          </div>
        </aside>

        <section className="demo-content">
          <div className="demo-welcome">
            <div>
              <span className="section-kicker">Wtorek, 25 sierpnia</span>
              <h1>Dzień dobry, Pani Dyrektor</h1>
              <p>Oto najważniejsze informacje na dzisiaj.</p>
            </div>
            <button className="demo-search" type="button">
              <Search aria-hidden="true" />
              <span>Szukaj grupy</span>
            </button>
          </div>

          <div className="demo-stats" aria-label="Podsumowanie szkoły">
            <article>
              <span>Aktywne grupy</span>
              <strong>{demoGroups.length}</strong>
              <small>gotowe do importu testowego</small>
            </article>
            <article>
              <span>Uczniowie demo</span>
              <strong>{demoStudentCount}</strong>
              <small>bez danych osobowych</small>
            </article>
            <article>
              <span>Grupa</span>
              <strong>2–7</strong>
              <small>osób w tym zestawie</small>
            </article>
          </div>

          <section className="school-centre" id="centrum">
            <div className="card-heading">
              <div>
                <span className="section-kicker">Centrum szkoły</span>
                <h2>Sprawy wymagające uwagi</h2>
              </div>
              <span className="demo-helper">Dane demonstracyjne</span>
            </div>
            <div className="school-module-grid">
              {schoolModules.map((module) => {
                const Icon = module.icon;
                return (
                  <article
                    className={`school-module school-module-${module.tone}`}
                    key={module.title}
                  >
                    <div className="school-module-icon">
                      <Icon aria-hidden="true" />
                    </div>
                    <span>{module.title}</span>
                    <strong>{module.value}</strong>
                    <small>{module.detail}</small>
                    <button type="button">
                      {module.action} <ChevronRight aria-hidden="true" />
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="today-card" id="dzisiaj">
              <div className="card-heading">
                <div>
                  <span className="section-kicker">Plan dnia</span>
                  <h2>Najbliższe zajęcia</h2>
                </div>
                <button type="button">Pełny grafik</button>
              </div>
              <div className="today-list">
                {todayLessons.map((lesson) => {
                  const group = demoGroups.find(
                    (item) => item.id === lesson.groupId,
                  );
                  if (!group) return null;

                  return (
                    <article key={lesson.groupId}>
                      <time>{lesson.time}</time>
                      <div className={`group-dot dot-${group.accent}`}>
                        {group.name.slice(0, 1)}
                      </div>
                      <div>
                        <strong>{group.name}</strong>
                        <span>
                          <MapPin aria-hidden="true" /> {lesson.room}
                        </span>
                      </div>
                      <span className="student-count">
                        <Users aria-hidden="true" /> {group.studentCount}
                      </span>
                      <ChevronRight aria-hidden="true" />
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="quick-card">
              <span className="section-kicker">Szybki start</span>
              <h2>Co chcesz zrobić?</h2>
              <button type="button">
                Dodaj zajęcia <ChevronRight aria-hidden="true" />
              </button>
              <button type="button">
                Sprawdź kolizje <ChevronRight aria-hidden="true" />
              </button>
              <button type="button">
                Wyślij ogłoszenie <ChevronRight aria-hidden="true" />
              </button>
              <button type="button">
                Przygotuj umowę <ChevronRight aria-hidden="true" />
              </button>
            </aside>
          </div>

          <section className="groups-section-demo" id="grupy">
            <div className="card-heading">
              <div>
                <span className="section-kicker">Rok 2025/26</span>
                <h2>Grupy do środowiska testowego</h2>
              </div>
              <span className="data-badge">0 danych osobowych</span>
            </div>
            <div className="demo-group-grid">
              {demoGroups.map((group) => (
                <article key={group.id}>
                  <div className={`group-dot dot-${group.accent}`}>
                    {group.name.slice(0, 1)}
                  </div>
                  <div>
                    <strong>{group.name}</strong>
                    <span>
                      {group.subject} · {group.classLabel}
                    </span>
                  </div>
                  <span className="student-count">
                    <Users aria-hidden="true" /> {group.studentCount}
                  </span>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>

      <nav className="mobile-demo-nav" aria-label="Nawigacja mobilna">
        <a className="active" href="#dzisiaj">
          <CalendarDays aria-hidden="true" /> Dzisiaj
        </a>
        <a href="#grupy">
          <Clock3 aria-hidden="true" /> Grafik
        </a>
        <a href="#grupy">
          <Users aria-hidden="true" /> Grupy
        </a>
        <a href="#centrum">
          <MoreHorizontal aria-hidden="true" /> Więcej
        </a>
      </nav>
    </main>
  );
}
