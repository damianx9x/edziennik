import { ArrowLeft, ShieldX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "@/app/components/brand";

export const metadata: Metadata = { title: "Brak dostępu" };

export default function AccessDeniedPage() {
  return (
    <main className="auth-page auth-page-compact">
      <div className="auth-topbar">
        <Brand compact />
      </div>
      <section className="auth-card auth-card-standalone">
        <div className="auth-card-icon">
          <ShieldX aria-hidden="true" />
        </div>
        <span className="auth-card-overline">Bezpieczny eDziennik</span>
        <h1>Ten panel nie należy do Twojej roli</h1>
        <p className="auth-card-lead">
          Niczego nie zmieniliśmy. Wróć do wyboru panelu i otwórz właściwy
          widok.
        </p>
        <Link className="button button-primary button-full" href="/panel">
          <ArrowLeft aria-hidden="true" /> Wybierz panel
        </Link>
      </section>
    </main>
  );
}
