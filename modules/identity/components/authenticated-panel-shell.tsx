import {
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  ContactRound,
  CreditCard,
  FileSignature,
  GraduationCap,
  Home,
  MessageCircleMore,
  ScrollText,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Brand } from "@/app/components/brand";
import { db } from "@/lib/server/db";
import type { ActiveSession } from "@/modules/identity/auth/session";
import { invitationRoleLabels } from "@/modules/identity/invitations/schema";

import { SignOutButton } from "./sign-out-button";
import { getNotifications } from "@/modules/notifications/service";
import { OnboardingTour } from "@/modules/onboarding/components/onboarding-tour";

type PanelSection =
  | "home"
  | "invitations"
  | "records"
  | "tools"
  | "statistics"
  | "notifications"
  | "schedule"
  | "contracts"
  | "payments"
  | "messages"
  | "logs";

function getNavigation(role: ActiveSession["user"]["role"]) {
  if (role === "SYSTEM_OWNER") {
    return [
      {
        href: "/panel/bog",
        label: "Centrum systemu",
        icon: Activity,
        key: "home",
      },
      {
        href: "/panel/szkola",
        label: "Panel szkoły",
        icon: ShieldCheck,
        key: "school",
      },
      {
        href: "/panel/bog/logi",
        label: "Głębokie logi",
        icon: ScrollText,
        key: "logs",
      },
      {
        href: "/panel/szkola/kartoteki",
        label: "Kartoteki",
        icon: ContactRound,
        key: "records",
      },
      {
        href: "/panel/szkola/narzedzia",
        label: "Ustawienia",
        icon: Wrench,
        key: "tools",
      },
      {
        href: "/panel/plan",
        label: "Grafik",
        icon: CalendarDays,
        key: "schedule",
      },
      {
        href: "/panel/szkola/statystyki",
        label: "Statystyki",
        icon: BarChart3,
        key: "statistics",
      },
    ] as const;
  }
  if (role === "DIRECTOR") {
    return [
      { href: "/panel/szkola", label: "Start", icon: Home, key: "home" },
      {
        href: "/panel/szkola/kartoteki",
        label: "Kartoteki",
        icon: ContactRound,
        key: "records",
      },
      {
        href: "/panel/plan",
        label: "Grafik",
        icon: CalendarDays,
        key: "schedule",
      },
      { href: "/panel/wiadomosci", label: "Wiadomości", icon: MessageCircleMore, key: "messages" },
      { href: "/panel/umowy", label: "Umowy", icon: FileSignature, key: "contracts" },
      { href: "/panel/platnosci", label: "Płatności", icon: CreditCard, key: "payments" },
      { href: "/panel/powiadomienia", label: "Powiadomienia", icon: Bell, key: "notifications" },
      {
        href: "/panel/szkola/narzedzia",
        label: "Ustawienia",
        icon: Wrench,
        key: "tools",
      },
      {
        href: "/panel/szkola/statystyki",
        label: "Statystyki",
        icon: BarChart3,
        key: "statistics",
      },
    ] as const;
  }
  if (role === "TEACHER") {
    return [
      { href: "/panel/szkola", label: "Start", icon: Home, key: "home" },
      {
        href: "/panel/plan",
        label: "Mój plan",
        icon: CalendarDays,
        key: "schedule",
      },
      {
        href: "/panel/szkola/kartoteki",
        label: "Kartoteki",
        icon: ContactRound,
        key: "records",
      },
      {
        href: "/panel/wiadomosci",
        label: "Wiadomości",
        icon: MessageCircleMore,
        key: "messages",
      },
      { href: "/panel/powiadomienia", label: "Powiadomienia", icon: Bell, key: "notifications" },
    ] as const;
  }
  if (role === "PARENT") {
    return [
      { href: "/panel/rodzic", label: "Start", icon: Home, key: "home" },
      {
        href: "/panel/plan",
        label: "Plan",
        icon: CalendarDays,
        key: "schedule",
      },
      { href: "/panel/umowy", label: "Umowy", icon: FileSignature, key: "contracts" },
      { href: "/panel/platnosci", label: "Płatności", icon: CreditCard, key: "payments" },
      {
        href: "/panel/wiadomosci",
        label: "Wiadomości",
        icon: Bell,
        key: "messages",
      },
      { href: "/panel/powiadomienia", label: "Powiadomienia", icon: Bell, key: "notifications" },
    ] as const;
  }
  return [
    { href: "/panel/uczen", label: "Start", icon: Home, key: "home" },
    {
      href: "/panel/plan",
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
    { href: "/panel/wiadomosci", label: "Wiadomości", icon: MessageCircleMore, key: "messages" },
    { href: "/panel/powiadomienia", label: "Powiadomienia", icon: Bell, key: "notifications" },
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
  const mobileNavigation =
    session.user.role === "SYSTEM_OWNER"
      ? navigation.filter((item) =>
          ["home", "school", "logs", "records", "schedule"].includes(item.key),
        )
      : session.user.role === "DIRECTOR"
        ? navigation.filter((item) =>
            ["home", "records", "schedule", "messages", "payments"].includes(item.key),
          )
        : session.user.role === "PARENT"
          ? navigation.filter((item) => item.key !== "notifications")
          : navigation;
  const [notificationItems, onboarding] = session.user.role === "SYSTEM_OWNER"
    ? [[], null] as const
    : await Promise.all([
        getNotifications(session),
        db.onboardingProgress.findUnique({ where: { userId: session.user.id }, select: { version: true, completedAt: true, dismissedAt: true } }),
      ]);
  const pendingChangeCount = notificationItems.filter((item) => !item.read).length;
  const feedbackRole = {
    SYSTEM_OWNER: "system-owner",
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
          {session.user.role !== "SYSTEM_OWNER" ? (
            <Link
              className="app-panel-notifications"
              href="/panel/powiadomienia"
              aria-label={`Centrum powiadomień: ${pendingChangeCount} nowych`}
            >
              <Bell aria-hidden="true" />
              {pendingChangeCount > 0 ? (
                <span>{pendingChangeCount > 99 ? "99+" : pendingChangeCount}</span>
              ) : null}
            </Link>
          ) : null}
          {session.user.role !== "SYSTEM_OWNER" ? <OnboardingTour role={session.user.role} openInitially={!onboarding || (onboarding.version < 1 && !onboarding.completedAt)} /> : null}
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
              <small>Etap 5 · dostęp wg roli</small>
            </div>
          </div>
        </aside>

        <section className="app-panel-content">{children}</section>
      </div>

      <nav className="app-mobile-nav" aria-label="Nawigacja mobilna">
        {mobileNavigation.map((item) => {
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
