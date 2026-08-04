"use client";

import { CircleAlert, House, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function PanelError({ reset }: { reset: () => void }) {
  return (
    <main className="auth-page auth-page-compact">
      <section className="auth-card auth-card-standalone" role="alert">
        <div className="auth-card-icon">
          <CircleAlert aria-hidden="true" />
        </div>
        <span className="auth-card-overline">Chwilowa przerwa</span>
        <h1>Nie udało się wczytać tego widoku</h1>
        <p className="auth-card-lead">
          Widok można bezpiecznie wczytać ponownie. Jeśli problem wróci, użyj
          przycisku zgłaszania błędu.
        </p>
        <button className="button button-primary button-full" onClick={reset}>
          <RefreshCw aria-hidden="true" /> Spróbuj ponownie
        </button>
        <Link className="button button-secondary button-full" href="/panel">
          <House aria-hidden="true" /> Wróć do panelu
        </Link>
      </section>
    </main>
  );
}
