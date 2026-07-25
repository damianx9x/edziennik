import { Clock3, ShieldX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "@/app/components/brand";
import { db } from "@/lib/server/db";
import { isIdentityRole } from "@/modules/identity/auth/access";
import { AcceptInvitationForm } from "@/modules/identity/components/accept-invitation-form";
import {
  getInvitationAvailability,
  invitationRoleLabels,
} from "@/modules/identity/invitations/schema";
import {
  hashInvitationToken,
  maskEmail,
} from "@/modules/identity/invitations/token";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Zaproszenie do eDziennika",
  robots: { index: false, follow: false },
};

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const safeToken =
    token.length >= 40 && token.length <= 128 ? token : "invalid";
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: hashInvitationToken(safeToken) },
    select: {
      name: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
    },
  });

  const availability = invitation
    ? getInvitationAvailability(invitation)
    : "expired";

  if (
    !invitation ||
    availability !== "ready" ||
    !isIdentityRole(invitation.role)
  ) {
    return (
      <main className="auth-page auth-page-compact">
        <div className="auth-topbar">
          <Brand compact />
        </div>
        <section className="auth-card auth-card-standalone">
          <div className="auth-card-icon">
            <ShieldX aria-hidden="true" />
          </div>
          <span className="auth-card-overline">Zaproszenie KLA</span>
          <h1>Ten link nie jest już aktywny</h1>
          <p className="auth-card-lead">
            Mógł wygasnąć, zostać cofnięty albo już utworzył konto. Poproś
            szkołę o nowe zaproszenie.
          </p>
          <Link className="button button-secondary button-full" href="/panel">
            Wróć do eDziennika
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="invitation-page">
      <div className="auth-topbar">
        <Brand compact />
        <span className="invitation-expiry">
          <Clock3 aria-hidden="true" />
          Link jednorazowy
        </span>
      </div>
      <AcceptInvitationForm
        token={safeToken}
        name={invitation.name}
        maskedEmail={maskEmail(invitation.email)}
        role={invitation.role}
        roleLabel={invitationRoleLabels[invitation.role]}
      />
    </main>
  );
}
