import type { Metadata } from "next";
import { Check, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { redirect } from "next/navigation";

import { Brand } from "@/app/components/brand";
import { db } from "@/lib/server/db";
import { FirstRunForm } from "@/modules/bootstrap/first-run-form";
import {
  isTransactionalEmailConfigured,
  maskEmail,
} from "@/modules/bootstrap/security";

export const metadata: Metadata = {
  title: "Pierwsze uruchomienie",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function FirstRunPage() {
  const emailReady = isTransactionalEmailConfigured();
  const owner = await db.user.findFirst({
    where: { role: "SYSTEM_OWNER" },
    select: { email: true, emailVerified: true },
  });

  if (owner?.emailVerified) redirect("/panel/logowanie");

  return (
    <main className="auth-page first-run-page">
      <div className="auth-topbar">
        <Brand compact />
        <span className="first-run-private">
          <ShieldCheck aria-hidden="true" /> Prywatna konfiguracja
        </span>
      </div>
      <div className="security-setup-page first-run-layout">
        <section className="security-setup-intro">
          <span className="auth-kicker">Czysta instalacja eDziennika</span>
          <h1>Zacznij spokojnie, krok po kroku.</h1>
          <p>
            Baza nie zawiera uczniów, rodziców, grup ani danych
            demonstracyjnych. Najpierw zabezpieczymy jedyne konto administracji
            technicznej.
          </p>
          <ol
            className="security-steps"
            aria-label="Kroki pierwszego uruchomienia"
          >
            <li className="active">
              <span>1</span>
              <UserPlus aria-hidden="true" /> Konto i e-mail
            </li>
            <li>
              <span>2</span>
              <Mail aria-hidden="true" />{" "}
              {emailReady ? "Potwierdzenie adresu" : "Poczta później"}
            </li>
            <li>
              <span>3</span>
              <ShieldCheck aria-hidden="true" /> MFA i kody awaryjne
            </li>
            <li>
              <span>4</span>
              <Check aria-hidden="true" /> Pierwsze zaproszenia
            </li>
          </ol>
        </section>
        <FirstRunForm
          emailReady={emailReady}
          pendingActivationEmail={owner ? maskEmail(owner.email) : undefined}
        />
      </div>
    </main>
  );
}
