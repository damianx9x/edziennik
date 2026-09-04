import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Brand } from "@/app/components/brand";
import { db } from "@/lib/server/db";
import { getServerSession } from "@/modules/identity/auth/session";
import { TemporaryPasswordChangeForm } from "@/modules/identity/components/temporary-password-change-form";

export const metadata: Metadata = { title: "Ustaw własne hasło" };

export default async function TemporaryPasswordChangePage() {
  const session = await getServerSession();
  if (!session?.user.id) redirect("/panel/logowanie");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordChangeRequired: true, temporaryPasswordExpiresAt: true },
  });
  if (!user?.passwordChangeRequired) redirect("/panel");

  const expired = !user.temporaryPasswordExpiresAt;

  return (
    <main className="auth-page auth-page-compact temporary-password-page">
      <div className="auth-topbar"><Brand compact /></div>
      <section className="auth-card auth-card-standalone">
        <div className="auth-card-icon"><KeyRound aria-hidden="true" /></div>
        <span className="auth-card-overline">Jednorazowe zabezpieczenie</span>
        <h1>Ustaw własne hasło</h1>
        <p className="auth-card-lead">
          Administrator pomógł Ci odzyskać konto. Hasło tymczasowe działa tylko
          przez 30 minut i nie otworzy panelu, dopóki nie ustawisz własnego.
        </p>
        <TemporaryPasswordChangeForm expired={expired} />
      </section>
    </main>
  );
}
