"use server";

import { z } from "zod";

import { auth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";
import { resolveEmailProvider } from "@/modules/identity/email/provider-config";

export type PasswordResetActionState = { status: "idle" | "success" | "error"; message?: string };

export async function sendUserPasswordResetAction(
  _: PasswordResetActionState,
  formData: FormData,
): Promise<PasswordResetActionState> {
  const session = await requireDirector();
  const parsed = z.uuid().safeParse(formData.get("userId"));
  if (!parsed.success) return { status: "error", message: "Nie rozpoznano konta." };
  if (!resolveEmailProvider()) return { status: "error", message: "Najpierw skonfiguruj SMTP w Centrum systemu. Bez poczty użytkownik nie otrzyma bezpiecznego linku." };
  const user = await db.user.findFirst({
    where: { id: parsed.data, schoolId: session.user.schoolId, archivedAt: null, status: { in: ["ACTIVE", "INVITED", "SUSPENDED"] } },
    select: { id: true, email: true, accounts: { select: { id: true }, take: 1 } },
  });
  if (!user?.email || user.accounts.length === 0) return { status: "error", message: "Ta kartoteka nie ma jeszcze aktywnego konta z adresem e-mail." };
  try {
    await auth.api.requestPasswordReset({ body: { email: user.email, redirectTo: "/panel/nowe-haslo" } });
    await db.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "identity.password_reset.requested_by_director", entityType: "User", entityId: user.id } });
    return { status: "success", message: "Bezpieczny link do ustawienia nowego hasła został wysłany." };
  } catch {
    return { status: "error", message: "Wiadomość nie została wysłana. Sprawdź SMTP w Centrum systemu i spróbuj ponownie." };
  }
}
