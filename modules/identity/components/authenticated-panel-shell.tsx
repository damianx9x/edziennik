import {
  Bell,
  CalendarDays,
  ContactRound,
  GraduationCap,
  Home,
  MailPlus,
  MessageCircleMore,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Brand } from "@/app/components/brand";
import { db } from "@/lib/server/db";
import type { ActiveSession } from "@/modules/identity/auth/session";
import { invitationRoleLabels } from "@/modules/identity/invitations/schema";

import { SignOutButton } from "./sign-out-button";

type PanelSection =
  | "home"
  | "invitations"
  | "records"
  | "tools"
  | "notifications";

function getNavigation(role: ActiveSession["user"]["role"]) {
  if (role === "DIRECTOR") {
    return [
      { href: "/panel/szkola", label: "Start", icon: Home, key: "home" },
      {
        href: "/panel/szkola/zaproszenia",
        label: "Zaproszenia",
        icon: MailPlus,
        key: "invitations",
      },
      {
        href: "/panel/szkola/kartoteki",
        label: "Kartoteki",
        icon: ContactRound,
        key: "records",
      },
      {
        href: "/panel/szkola/narzedzia",
        label: "Narzędzia",
        icon: Wrench,
        key: "tools",
      },
      {
        href: "/panel/szkola/powiadomienia",
        label: "Powiadomienia",
        icon: Bell,
        key: "notifications",
      },
      {
        href: "/panel/szkola#grafik",
        label: "Grafik",
        icon: CalendarDays,
        key: "schedule",
      },
    ] as const;
  }
  if (role === "TEACHER") {
    return [
      { href: "/panel/szkola", label: "Start", icon: Home, key: "home" },
      {
        href: "/panel/szkola/kartoteki",
        label: "Kartoteki",
        icon: ContactRound,
        key: "records",
      },
      {
        href: "/panel/szkola#wiadomosci",
        label: "Wiadomości",
        icon: MessageCircleMore,
        key: "messages",
      },
    ] as const;
  }
  if (role === "PARENT") {
    return [
      { href: "/panel/rodzic", label: "Start", icon: Home, key: "home" },
      {
        href: "/panel/rodzic#plan",
        label: "Plan",
        icon: CalendarDays,
        key: "schedule",
      },
      {
        href: "/panel/rodzic#wiadomosci",
        label: "Wiadomości",
        icon: Bell,
        key: "messages",
      },
    ] as const;
  }
  return [
    { href: "/panel/uczen", label: "Start", icon: Home, key: "home" },
    {
      href: "/panel/uczen#plan",
      label: "Plan",
      icon: CalendarDays,
      key: "schedule",
    },
    {
      href: "/panel/uczen#zadania",
      label: "Zadania",
      icon: GraduationCap,
      key: "tasks",
    },
  ] as const;
}

export async function AuthenticatedPanelShell({
  session,
  active = "home",
  children,
}: {
  session: ActiveSession;
  active?: PanelSection;
  children: ReactNode;
}) {
  const navigation = getNavigation(session.user.role);
  const pendingChangeCount =
    session.user.role === "DIRECTOR"
      ? await db.recordChangeRequest.count({
          where: {
            schoolId: session.user.schoolId,
            status: "PENDING",
          },
        })
      : 0;
  const feedbackRole = {
    DIRECTOR: "director",
    TEACHER: "teacher",
    PARENT: "parent",
    STUDENT: "student",
  }[session.user.role];
  const initials = session.user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("")
    .toLocaleUpperCase("pl-PL");

  return (
    <main className="app-panel" data-feedback-role={feedbackRole}>
      <header className="app-panel-topbar">
        <Brand compact />
        <div className="app-panel-account">
          {session.user.role === "DIRECTOR" ? (
            <Link
              className="app-panel-notifications"
              href="/panel/szkola/powiadomienia"
              aria-label={`Centrum powiadomień: ${pendingChangeCount} oczekujących zmian`}
            >
              <Bell aria-hidden="true" />
              {pendingChangeCount > 0 ? (
                <span>{pendingChangeCount > 99 ? "99+" : pendingChangeCount}</span>
              ) : null}
            </Link>
          ) : null}
          <div className="app-panel-avatar" aria-hidden="true">
            {initials || "K"}
          </div>
          <span>
            <strong>{session.user.name}</strong>
            <small>{invitationRoleLabels[session.user.role]}</small>
          </span>
          <SignOutButton compact />
        </div>
      </header>

      <div className="app-panel-layout">
        <aside className="app-panel-sidebar">
          <nav aria-label="Nawigacja eDziennika">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={active === item.key ? "active" : undefined}
                >
                  <Icon aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="app-sidebar-safety">
            <span className="status-dot" />
            <div>
              <strong>Bezpieczna sesja</strong>
              <small>Etap 2 · dostęp wg roli</small>
            </div>
          </div>
        </aside>

        <section className="app-panel-content">{children}</section>
      </div>

      <nav className="app-mobile-nav" aria-label="Nawigacja mobilna">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={active === item.key ? "active" : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
