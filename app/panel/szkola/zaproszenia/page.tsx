import {
  Ban,
  CheckCircle2,
  Clock3,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";

import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";
import { InvitationManager } from "@/modules/identity/components/invitation-manager";
import { revokeInvitationAction } from "@/modules/identity/invitations/actions";
import {
  getInvitationAvailability,
  invitationRoleLabels,
} from "@/modules/identity/invitations/schema";
import { maskEmail } from "@/modules/identity/invitations/token";

export const metadata: Metadata = { title: "Zaproszenia" };
export const dynamic = "force-dynamic";

export default async function InvitationsPage() {
  const session = await requireDirector();
  const invitations = await db.invitation.findMany({
    where: { schoolId: session.user.schoolId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
    },
  });

  return (
    <AuthenticatedPanelShell session={session} active="invitations">
      <header className="role-panel-heading">
        <div>
          <span className="section-kicker">Dostęp do eDziennika</span>
          <h1>Zaproszenia i konta</h1>
          <p>
            Nie ma publicznej rejestracji. Każde konto zaczyna się od
            jednorazowego linku albo kodu QR utworzonego przez szkołę.
          </p>
        </div>
        <span className="role-security-chip">
          <ShieldCheck aria-hidden="true" />
          Tylko dyrektor
        </span>
      </header>

      <div className="invitation-workspace">
        <InvitationManager />

        <section className="invitation-list-card">
          <div className="card-heading">
            <div>
              <span className="section-kicker">Ostatnie 30</span>
              <h2>Historia zaproszeń</h2>
            </div>
            <span className="stage-one-badge">{invitations.length} pozycji</span>
          </div>

          {invitations.length === 0 ? (
            <div className="invitation-empty">
              <MailCheck aria-hidden="true" />
              <h3>Nie ma jeszcze zaproszeń</h3>
              <p>
                Użyj formularza obok. Link będzie ważny przez 7 dni i zadziała
                tylko raz.
              </p>
            </div>
          ) : (
            <div className="invitation-list">
              {invitations.map((invitation) => {
                const availability = getInvitationAvailability(invitation);
                const role = invitation.role as keyof typeof invitationRoleLabels;
                return (
                  <article key={invitation.id}>
                    <div className="invitation-person">
                      <div aria-hidden="true">
                        {invitation.name.slice(0, 1).toLocaleUpperCase("pl-PL")}
                      </div>
                      <span>
                        <strong>{invitation.name}</strong>
                        <small>{maskEmail(invitation.email)}</small>
                      </span>
                    </div>
                    <span className="invitation-role">
                      {invitationRoleLabels[role] ?? "Użytkownik"}
                    </span>
                    <InvitationStatus
                      availability={availability}
                      expiresAt={invitation.expiresAt}
                    />
                    {availability === "ready" ? (
                      <form action={revokeInvitationAction}>
                        <input
                          type="hidden"
                          name="invitationId"
                          value={invitation.id}
                        />
                        <button
                          className="invitation-revoke"
                          type="submit"
                          aria-label={`Cofnij zaproszenie dla ${invitation.name}`}
                        >
                          <Ban aria-hidden="true" /> Cofnij
                        </button>
                      </form>
                    ) : (
                      <span />
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AuthenticatedPanelShell>
  );
}

function InvitationStatus({
  availability,
  expiresAt,
}: {
  availability: ReturnType<typeof getInvitationAvailability>;
  expiresAt: Date;
}) {
  if (availability === "accepted") {
    return (
      <span className="invitation-status status-accepted">
        <CheckCircle2 aria-hidden="true" /> Konto utworzone
      </span>
    );
  }
  if (availability === "revoked") {
    return (
      <span className="invitation-status status-revoked">
        <Ban aria-hidden="true" /> Cofnięte
      </span>
    );
  }
  if (availability === "expired") {
    return (
      <span className="invitation-status status-expired">
        <Clock3 aria-hidden="true" /> Wygasło
      </span>
    );
  }
  return (
    <span className="invitation-status status-ready">
      <Clock3 aria-hidden="true" />
      Do{" "}
      {new Intl.DateTimeFormat("pl-PL", {
        day: "2-digit",
        month: "short",
        timeZone: "Europe/Warsaw",
      }).format(expiresAt)}
    </span>
  );
}
