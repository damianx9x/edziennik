import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { can } from "@/modules/access-control/can";
import { getRoleHome } from "@/modules/identity/auth/redirects";
import { requireActiveSession } from "@/modules/identity/auth/session";
import { TwoFactorSetup } from "@/modules/identity/components/two-factor-setup";

export const metadata: Metadata = { title: "Zabezpiecz konto dyrektora" };
export const dynamic = "force-dynamic";

export default async function TwoFactorSetupPage() {
  const session = await requireActiveSession("/panel/bezpieczenstwo/2fa");

  if (
    !can(
      {
        id: session.user.id,
        role: session.user.role,
        schoolId: session.user.schoolId,
      },
      "view:director-dashboard",
      { schoolId: session.user.schoolId },
    )
  ) {
    redirect(getRoleHome(session.user.role));
  }

  if (session.user.twoFactorEnabled === true) {
    redirect("/panel/szkola");
  }

  const firstName = session.user.name.trim().split(/\s+/)[0] || "Dyrektorze";
  return <TwoFactorSetup firstName={firstName} />;
}
