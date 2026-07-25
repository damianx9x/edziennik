import { ArrowLeft, LockKeyhole } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Logowanie" };

const roleLabels = {
  uczen: "ucznia",
  rodzic: "rodzica",
  szkola: "szkoły",
} as const;

type RoleSlug = keyof typeof roleLabels;

export default async function LoginPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ rola?: string }>;
}) {
  const { rola } = await searchParams;
  const safeRole = rola && rola in roleLabels ? (rola as RoleSlug) : "rodzic";

  return (
    <main className="panel-shell">
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
          To gotowy przepływ demonstracyjny Etapu 0. Bezpieczne logowanie i
          cztery role zostaną podłączone w Etapie 1.
        </p>
        <div className="stage-notice" role="status">
          Nie prosimy jeszcze o e-mail ani hasło, bo aplikacja nie przechowuje
          teraz żadnych danych użytkowników.
        </div>
        <Link className="button button-primary button-full" href="/panel">
          Wróć do wyboru panelu
        </Link>
      </section>
    </main>
  );
}
