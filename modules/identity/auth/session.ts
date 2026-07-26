import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth, type AuthSession } from "@/lib/server/auth";
import { can, type Action, type Actor } from "@/modules/access-control/can";

import {
  isIdentityRole,
  type IdentityRole,
} from "./access";
import { isMfaRequiredForRole } from "./mfa-policy";

export type ActiveSession = AuthSession & {
  user: AuthSession["user"] & {
    role: IdentityRole;
    schoolId: string;
    status: "ACTIVE";
    twoFactorEnabled?: boolean | null;
  };
};

export const getServerSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session as AuthSession | null;
});

function isActiveSession(
  session: AuthSession | null,
): session is ActiveSession {
  return Boolean(
    session &&
      isIdentityRole(session.user.role) &&
      typeof session.user.schoolId === "string" &&
      session.user.schoolId.length > 0 &&
      session.user.status === "ACTIVE",
  );
}

export async function requireActiveSession(
  returnPath = "/panel",
): Promise<ActiveSession> {
  const session = await getServerSession();

  if (!session) {
    const query = new URLSearchParams({ powrot: returnPath });
    redirect(`/panel/logowanie?${query.toString()}`);
  }

  if (!isActiveSession(session)) {
    redirect("/panel/konto-nieaktywne");
  }

  return session;
}

export async function requirePanelAccess(
  action: Extract<
    Action,
    | "view:owner-dashboard"
    | "view:director-dashboard"
    | "view:teacher-dashboard"
    | "view:parent-dashboard"
    | "view:student-dashboard"
  >,
  returnPath: string,
): Promise<ActiveSession> {
  const session = await requireActiveSession(returnPath);
  const actor: Actor = {
    id: session.user.id,
    schoolId: session.user.schoolId,
    role: session.user.role,
  };

  if (!can(actor, action, { schoolId: session.user.schoolId })) {
    redirect("/panel/brak-dostepu");
  }

  if (
    isMfaRequiredForRole(session.user.role) &&
    session.user.twoFactorEnabled !== true
  ) {
    redirect("/panel/bezpieczenstwo/2fa");
  }

  return session;
}

export async function requireDirector(
  returnPath = "/panel/szkola/zaproszenia",
): Promise<ActiveSession> {
  return requirePanelAccess(
    "view:director-dashboard",
    returnPath,
  );
}

export async function requireSystemOwner(
  returnPath = "/panel/bog",
): Promise<ActiveSession> {
  return requirePanelAccess("view:owner-dashboard", returnPath);
}

export async function requireSchoolStaff(
  returnPath = "/panel/szkola",
): Promise<ActiveSession> {
  const session = await requireActiveSession(returnPath);
  if (
    session.user.role !== "SYSTEM_OWNER" &&
    session.user.role !== "DIRECTOR" &&
    session.user.role !== "TEACHER"
  ) {
    redirect("/panel/brak-dostepu");
  }
  if (
    isMfaRequiredForRole(session.user.role) &&
    session.user.twoFactorEnabled !== true
  ) {
    redirect("/panel/bezpieczenstwo/2fa");
  }
  return session;
}
