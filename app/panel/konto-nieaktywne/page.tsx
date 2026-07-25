import { ArrowLeft, CirclePause } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "@/app/components/brand";

export const metadata: Metadata = { title: "Konto nieaktywne" };

export default function InactiveAccountPage() {
  return (
    <main className="auth-page auth-page-compact">
      <div className="auth-topbar">
        <Brand compact />
      </div>
      <section className="auth-card auth-card-standalone">
        <div className="auth-card-icon">
          <CirclePause aria-hidden="true" />
        </div>
        <span className="auth-card-overline">Status konta</span>
        <h1>Konto nie jest teraz aktywne</h1>
        <p className="auth-card-lead">
          Zaproszenie mogło wygasnąć albo szkoła wstrzymała dostęp. Skontaktuj
          się z King’s Language Academy.
        </p>
        <Link className="button button-secondary button-full" href="/panel">
          <ArrowLeft aria-hidden="true" /> Wróć
        </Link>
      </section>
    </main>
  );
}
