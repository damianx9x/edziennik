import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "../components/brand";

export const metadata: Metadata = { title: "eDziennik" };

export default function PanelPage() {
  if (process.env.KLA_STATIC_PREVIEW !== "1") {
    redirect("/panel/logowanie");
  }

  return (
    <main className="panel-shell">
      <div className="panel-topbar">
        <Brand compact />
        <Link className="back-link" href="/">
          <ArrowLeft size={18} aria-hidden="true" /> Strona szkoły
        </Link>
      </div>
      <section className="single-panel-entry" aria-labelledby="entry-title">
        <div className="login-preview-icon">
          <LockKeyhole aria-hidden="true" />
        </div>
        <span className="section-kicker">eDziennik King’s</span>
        <h1 id="entry-title">Jedno logowanie dla wszystkich</h1>
        <p>
          Wpisujesz e-mail i hasło. System sam otwiera właściwy panel ucznia,
          rodzica, wykładowcy albo dyrektora.
        </p>
        <Link className="button button-primary" href="/panel/logowanie">
          Przejdź do logowania <ArrowRight aria-hidden="true" />
        </Link>
        <span className="privacy-note">
          <ShieldCheck aria-hidden="true" />
          Uprawnienia wynikają z konta, nie z wybranego przycisku.
        </span>
      </section>
    </main>
  );
}
