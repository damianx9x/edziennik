"use client";

import {
  ArrowLeft,
  ArrowRight,
  LayoutDashboard,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";

import { Brand } from "../../components/brand";

export function LoginPreview() {
  return (
    <main className="panel-shell">
      <div className="panel-topbar">
        <Brand compact />
        <Link className="back-link" href="/">
          <ArrowLeft size={18} aria-hidden="true" /> Strona szkoły
        </Link>
      </div>
      <section className="login-preview" aria-labelledby="login-title">
        <div className="login-preview-icon">
          <LockKeyhole aria-hidden="true" />
        </div>
        <h1 id="login-title">Jedno logowanie</h1>
        <p>
          E-mail i hasło wystarczą. System sam otworzy właściwy panel zgodnie z
          rolą zapisaną na koncie.
        </p>
        <div className="stage-notice" role="status">
          Publiczny pokaz nie przyjmuje prawdziwych danych logowania. Działające
          konta są dostępne wyłącznie w bezpiecznej aplikacji Node.js.
        </div>
        <div className="login-actions">
          <Link
            className="button button-primary button-full"
            href="/panel/demo"
            data-testid="open-demo-dashboard"
          >
            <LayoutDashboard aria-hidden="true" />
            Zobacz panel demonstracyjny
          </Link>
          <Link className="button button-secondary button-full" href="/">
            Wróć na stronę szkoły
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
