import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { can } from "@/modules/access-control/can";
import { getRoleHome } from "@/modules/identity/auth/redirects";
import { isMfaRequiredForRole } from "@/modules/identity/auth/mfa-policy";
import { requireActiveSession } from "@/modules/identity/auth/session";
import { TwoFactorSetup } from "@/modules/identity/components/two-factor-setup";

export const metadata: Metadata = { title: "Zabezpiecz konto uprzywilejowane" };
export const dynamic = "force-dynamic";

export default async function TwoFactorSetupPage() {
  const session = await requireActiveSession("/panel/bezpieczenstwo/2fa");
  const accessAction =
    session.user.role === "SYSTEM_OWNER"
      ? "view:owner-dashboard"
      : "view:director-dashboard";

  if (
    !isMfaRequiredForRole(session.user.role) ||
    !can(
      {
        id: session.user.id,
        role: session.user.role,
        schoolId: session.user.schoolId,
      },
      accessAction,
      { schoolId: session.user.schoolId },
    )
  ) {
    redirect(getRoleHome(session.user.role));
  }

  if (session.user.twoFactorEnabled === true) {
    redirect(getRoleHome(session.user.role));
  }

  const firstName = session.user.name.trim().split(/\s+/)[0] || "Dyrektorze";
  return (
    <TwoFactorSetup
      firstName={firstName}
      accountLabel={
        session.user.role === "SYSTEM_OWNER"
          ? "właściciela systemu"
          : "dyrektora"
      }
      returnPath={getRoleHome(session.user.role)}
    />
  );
}
