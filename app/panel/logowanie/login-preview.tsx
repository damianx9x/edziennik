"use client";

import {
  ArrowLeft,
  ArrowRight,
  LayoutDashboard,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Brand } from "../../components/brand";

const roleLabels = {
  uczen: "ucznia",
  rodzic: "rodzica",
  szkola: "szkoły",
} as const;

type RoleSlug = keyof typeof roleLabels;

export function LoginPreview() {
  const searchParams = useSearchParams();
  const role = searchParams.get("rola");
  const safeRole =
    role && role in roleLabels ? (role as RoleSlug) : ("rodzic" as const);

  return (
    <main className="panel-shell">
      <div className="panel-topbar">
        <Brand compact />
        <Link className="back-link" href="/panel">
          <ArrowLeft size={18} aria-hidden="true" /> Zmień panel
        </Link>
      </div>
      <section className="login-preview" aria-labelledby="login-title">
        <div className="login-preview-icon">
          <LockKeyhole aria-hidden="true" />
        </div>
        <h1 id="login-title">Panel {roleLabels[safeRole]}</h1>
        <p>
          To bezpieczny podgląd pilota KLA. Logowanie, zaproszenia i cztery role
          zostaną podłączone w Etapie 1.
        </p>
        <div className="stage-notice" role="status">
          Nie prosimy jeszcze o e-mail ani hasło, bo aplikacja nie przechowuje
          teraz żadnych danych użytkowników.
        </div>
        <div className="login-actions">
          {safeRole === "szkola" ? (
            <Link
              className="button button-primary button-full"
              href="/panel/demo"
              data-testid="open-demo-dashboard"
            >
              <LayoutDashboard aria-hidden="true" />
              Zobacz panel demonstracyjny
            </Link>
          ) : null}
          <Link className="button button-secondary button-full" href="/panel">
            Wróć do wyboru panelu
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
