import {
  Activity,
  BarChart3,
  Bell,
  BookOpenText,
  CalendarDays,
  ContactRound,
  CreditCard,
  FileSignature,
  GraduationCap,
  Home,
  MessageCircleMore,
  NotebookTabs,
  ScrollText,
  ShieldCheck,
  Settings2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { Brand } from "@/app/components/brand";
import { db } from "@/lib/server/db";
import type { ActiveSession } from "@/modules/identity/auth/session";
import { invitationRoleLabels } from "@/modules/identity/invitations/schema";

import { SignOutButton } from "./sign-out-button";
import { getNotifications } from "@/modules/notifications/service";
import { OnboardingTour } from "@/modules/onboarding/components/onboarding-tour";
import { CreatorEasterEgg } from "./creator-easter-egg";
import { getModuleAccessPolicy, moduleIsEnabled } from "@/modules/module-access/server";
import type { ConfigurableModuleKey } from "@/modules/module-access/catalog";

type PanelSection =
  | "home"
  | "school"
  | "invitations"
  | "records"
  | "tools"
  | "statistics"
  | "notifications"
  | "schedule"
  | "contracts"
  | "payments"
  | "messages"
  | "learning"
  | "progress"
  | "logs"
  | "help"
  | "server-settings";

function navigationGroup(
  role: ActiveSession["user"]["role"],
  key: string,
): string | null {
  if (role === "SYSTEM_OWNER") {
    if (["home", "logs", "server-settings"].includes(key)) return "System";
    if (["school", "records", "invitations", "schedule", "messages", "notifications"].includes(key)) return "Obsługa szkoły";
    if (["learning", "progress"].includes(key)) return "Nauka";
    if (["contracts", "payments"].includes(key)) return "Dokumenty i rozliczenia";
    if (["tools", "statistics"].includes(key)) return "Administracja szkołą";
  }
  if (role === "DIRECTOR") {
    if (["home", "schedule", "messages", "notifications"].includes(key)) return "Codzienna praca";
    if (["records", "invitations"].includes(key)) return "Szkoła i osoby";
    if (["learning", "progress"].includes(key)) return "Nauka";
    if (["contracts", "payments"].includes(key)) return "Dokumenty i rozliczenia";
    if (["tools", "statistics"].includes(key)) return "Administracja";
  }
  return null;
}

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
        href: "/panel/bog/logi",
        label: "Bezpieczeństwo i zdarzenia",
        icon: ScrollText,
        key: "logs",
      },
      {
        href: "/panel/bog/ustawienia",
        label: "Serwer i integracje",
        icon: Settings2,
        key: "server-settings",
      },
      {
        href: "/panel/szkola",
        label: "Panel szkoły",
        icon: ShieldCheck,
        key: "school",
      },
      {
        href: "/panel/szkola/kartoteki",
        label: "Kartoteki",
        icon: ContactRound,
        key: "records",
      },
      {
        href: "/panel/szkola/zaproszenia",
        label: "Zaproszenia",
        icon: ContactRound,
        key: "invitations",
      },
      {
        href: "/panel/plan",
        label: "Grafik",
        icon: CalendarDays,
        key: "schedule",
      },
      { href: "/panel/wiadomosci", label: "Wiadomości", icon: MessageCircleMore, key: "messages" },
      { href: "/panel/powiadomienia", label: "Powiadomienia", icon: Bell, key: "notifications" },
      { href: "/panel/nauka", label: "Nauka", icon: GraduationCap, key: "learning" },
      { href: "/panel/postepy", label: "Postępy", icon: NotebookTabs, key: "progress" },
      { href: "/panel/umowy", label: "Umowy", icon: FileSignature, key: "contracts" },
      { href: "/panel/platnosci", label: "Płatności", icon: CreditCard, key: "payments" },
      {
        href: "/panel/szkola/narzedzia",
        label: "Ustawienia szkoły",
        icon: Wrench,
        key: "tools",
      },
      {
        href: "/panel/szkola/statystyki",
        label: "Statystyki szkoły",
        icon: BarChart3,
        key: "statistics",
      },
    ] as const;
  }
  if (role === "DIRECTOR") {
    return [
      { href: "/panel/szkola", label: "Start", icon: Home, key: "home" },
      {
        href: "/panel/plan",
        label: "Grafik",
        icon: CalendarDays,
        key: "schedule",
      },
      { href: "/panel/wiadomosci", label: "Wiadomości", icon: MessageCircleMore, key: "messages" },
      { href: "/panel/powiadomienia", label: "Powiadomienia", icon: Bell, key: "notifications" },
      {
        href: "/panel/szkola/kartoteki",
        label: "Kartoteki",
        icon: ContactRound,
        key: "records",
      },
      {
        href: "/panel/szkola/zaproszenia",
        label: "Zaproszenia i konta",
        icon: ContactRound,
        key: "invitations",
      },
      { href: "/panel/nauka", label: "Nauka", icon: GraduationCap, key: "learning" },
      { href: "/panel/postepy", label: "Postępy", icon: NotebookTabs, key: "progress" },
      { href: "/panel/umowy", label: "Umowy", icon: FileSignature, key: "contracts" },
      { href: "/panel/platnosci", label: "Płatności", icon: CreditCard, key: "payments" },
      {
        href: "/panel/szkola/narzedzia",
        label: "Ustawienia",
        icon: Wrench,
        key: "tools",
      },
      {
        href: "/panel/szkola/statystyki",
        label: "Statystyki i odwiedziny",
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
      { href: "/panel/nauka", label: "Nauka", icon: GraduationCap, key: "learning" },
      { href: "/panel/postepy", label: "Postępy", icon: NotebookTabs, key: "progress" },
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
      { href: "/panel/nauka", label: "Nauka", icon: GraduationCap, key: "learning" },
      { href: "/panel/postepy", label: "Postępy", icon: NotebookTabs, key: "progress" },
      {
        href: "/panel/wiadomosci",
        label: "Wiadomości",
        icon: MessageCircleMore,
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
      href: "/panel/nauka",
      label: "Nauka",
      icon: GraduationCap,
      key: "learning",
    },
    { href: "/panel/postepy", label: "Postępy", icon: NotebookTabs, key: "progress" },
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
  const moduleAccess = await getModuleAccessPolicy(session.user.schoolId);
  const navigation = getNavigation(session.user.role).filter((item) =>
    session.user.role === "SYSTEM_OWNER" ||
    !Object.prototype.hasOwnProperty.call(moduleAccess, item.key) ||
    moduleIsEnabled(moduleAccess, item.key as ConfigurableModuleKey, session.user.role),
  );
  const notificationsEnabled = moduleIsEnabled(
    moduleAccess,
    "notifications",
    session.user.role,
  );
  const mobileNavigation =
    session.user.role === "SYSTEM_OWNER"
      ? navigation.filter((item) =>
          ["home", "school", "logs", "records", "schedule"].includes(item.key),
        )
      : session.user.role === "DIRECTOR"
        ? navigation.filter((item) =>
            ["home", "records", "schedule", "messages", "learning"].includes(item.key),
          )
        : session.user.role === "PARENT"
          ? navigation.filter((item) => ["home", "schedule", "learning", "messages", "payments"].includes(item.key))
          : session.user.role === "TEACHER"
            ? navigation.filter((item) => ["home", "schedule", "learning", "messages", "progress"].includes(item.key))
            : navigation.filter((item) => ["home", "schedule", "learning", "progress", "messages"].includes(item.key));
  const [notificationItems, onboarding] = await Promise.all([
        notificationsEnabled ? getNotifications(session) : Promise.resolve([]),
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
          <Link className="app-panel-manual" href="/panel/pomoc" aria-label="Pomoc i podręczniki">
            <BookOpenText aria-hidden="true" /><span>Instrukcja</span>
          </Link>
          {notificationsEnabled ? <Link
              className="app-panel-notifications"
              href="/panel/powiadomienia"
              aria-label={`Centrum powiadomień: ${pendingChangeCount} nowych`}
            >
              <Bell aria-hidden="true" />
              {pendingChangeCount > 0 ? (
                <span>{pendingChangeCount > 99 ? "99+" : pendingChangeCount}</span>
              ) : null}
            </Link> : null}
          {session.user.role !== "SYSTEM_OWNER" ? <OnboardingTour role={session.user.role} enabledModules={(Object.keys(moduleAccess) as ConfigurableModuleKey[]).filter((key) => moduleIsEnabled(moduleAccess, key, session.user.role))} openInitially={!onboarding || (onboarding.version < 1 && !onboarding.completedAt)} /> : null}
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
            {navigation.map((item, index) => {
              const Icon = item.icon;
              const group = navigationGroup(session.user.role, item.key);
              const previousGroup = index > 0
                ? navigationGroup(session.user.role, navigation[index - 1].key)
                : null;
              return (
                <Fragment key={item.key}>
                  {group && group !== previousGroup ? (
                    <span className="app-panel-nav-group">{group}</span>
                  ) : null}
                  <Link
                    href={item.href}
                    className={active === item.key ? "active" : undefined}
                  >
                    <Icon aria-hidden="true" />
                    {item.label}
                  </Link>
                </Fragment>
              );
            })}
          </nav>
          <div className="app-sidebar-safety">
            <span className="status-dot" />
            <div>
              <strong>Bezpieczna sesja</strong>
              <small>Dostęp chroniony według roli</small>
            </div>
          </div>
          <CreatorEasterEgg />
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
              aria-label={item.label}
            >
              <Icon aria-hidden="true" />
              <span>{item.key === "notifications" ? "Alerty" : item.label}</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
