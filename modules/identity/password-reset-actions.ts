"use server";

import { z } from "zod";
import { hashPassword } from "better-auth/crypto";

import { auth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { requireDirector } from "@/modules/identity/auth/session";
import { resolveEmailProvider } from "@/modules/identity/email/provider-config";
import { sendAuthEmail } from "@/modules/identity/email/email-provider";
import { canRequestPasswordReset } from "@/modules/identity/password-reset-policy";
import {
  generateTemporaryPassword,
  temporaryPasswordLifetimeMinutes,
} from "@/modules/identity/temporary-password";

export type PasswordResetActionState = {
  status: "idle" | "success" | "warning" | "error";
  message?: string;
  temporaryPassword?: string;
  expiresAt?: string;
};

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
    select: { id: true, email: true, role: true, accounts: { select: { id: true }, take: 1 } },
  });
  if (!user?.email || user.accounts.length === 0) return { status: "error", message: "Ta kartoteka nie ma jeszcze aktywnego konta z adresem e-mail." };
  if (!canRequestPasswordReset(session.user.role, user.role)) {
    return {
      status: "error",
      message: "Konto właściciela systemu może odzyskać wyłącznie właściciel systemu.",
    };
  }
  try {
    await auth.api.requestPasswordReset({ body: { email: user.email, redirectTo: "/panel/nowe-haslo" } });
    await db.auditLog.create({ data: { schoolId: session.user.schoolId, actorId: session.user.id, action: "identity.password_reset.requested", entityType: "User", entityId: user.id, metadata: { actorRole: session.user.role, targetRole: user.role } } });
    return { status: "success", message: "Bezpieczny link do ustawienia nowego hasła został wysłany." };
  } catch {
    return { status: "error", message: "Wiadomość nie została wysłana. Sprawdź SMTP w Centrum systemu i spróbuj ponownie." };
  }
}

const temporaryPasswordRequestSchema = z.object({
  userId: z.uuid(),
  delivery: z.enum(["show", "email"]),
});

export async function createTemporaryPasswordAction(
  _: PasswordResetActionState,
  formData: FormData,
): Promise<PasswordResetActionState> {
  const session = await requireDirector();
  const parsed = temporaryPasswordRequestSchema.safeParse({
    userId: formData.get("userId"),
    delivery: formData.get("delivery"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Nie rozpoznano konta lub sposobu przekazania hasła." };
  }
  if (parsed.data.userId === session.user.id) {
    return {
      status: "error",
      message: "Własne hasło zmień w ustawieniach konta. Ta funkcja służy do pomocy innym osobom.",
    };
  }
  if (parsed.data.delivery === "email" && !resolveEmailProvider()) {
    return {
      status: "error",
      message: "Najpierw skonfiguruj SMTP. Możesz też wygenerować hasło i przekazać je osobiście.",
    };
  }

  const user = await db.user.findFirst({
    where: {
      id: parsed.data.userId,
      schoolId: session.user.schoolId,
      archivedAt: null,
      status: { in: ["ACTIVE", "INVITED", "SUSPENDED"] },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      accounts: {
        where: { providerId: "credential" },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!user?.email || user.accounts.length === 0) {
    return {
      status: "error",
      message: "Ta kartoteka nie ma jeszcze aktywnego konta z adresem e-mail.",
    };
  }
  if (!canRequestPasswordReset(session.user.role, user.role)) {
    return {
      status: "error",
      message: "Konto właściciela systemu może odzyskać wyłącznie właściciel systemu.",
    };
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const expiresAt = new Date(
    Date.now() + temporaryPasswordLifetimeMinutes * 60 * 1000,
  );

  await db.$transaction([
    db.account.update({
      where: { id: user.accounts[0].id },
      data: { password: passwordHash },
    }),
    db.user.update({
      where: { id: user.id },
      data: {
        passwordChangeRequired: true,
        temporaryPasswordExpiresAt: expiresAt,
      },
    }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action: "identity.password_reset.temporary_generated",
        entityType: "User",
        entityId: user.id,
        metadata: {
          actorRole: session.user.role,
          targetRole: user.role,
          delivery: parsed.data.delivery,
          expiresAt: expiresAt.toISOString(),
        },
      },
    }),
  ]);

  if (parsed.data.delivery === "email") {
    try {
      await sendAuthEmail({
        to: user.email,
        subject: "Tymczasowe hasło do eDziennika King’s",
        text: [
          `Dzień dobry ${user.name},`,
          "",
          "Administrator szkoły przygotował tymczasowe hasło:",
          temporaryPassword,
          "",
          `Hasło jest ważne przez ${temporaryPasswordLifetimeMinutes} minut. Po zalogowaniu system poprosi o ustawienie własnego hasła.`,
          "Jeśli nie oczekujesz tej wiadomości, skontaktuj się ze szkołą.",
          "",
          "King’s Language Academy",
        ].join("\n"),
        category: "password-reset",
      });
      return {
        status: "success",
        message: "Wysłano hasło tymczasowe. Użytkownik musi zmienić je po zalogowaniu.",
        expiresAt: expiresAt.toISOString(),
      };
    } catch {
      return {
        status: "warning",
        message: "Hasło zostało ustawione, ale e-mail nie wyszedł. Skopiuj je i przekaż bezpiecznym kanałem.",
        temporaryPassword,
        expiresAt: expiresAt.toISOString(),
      };
    }
  }

  return {
    status: "success",
    message: "Nowe hasło jest widoczne tylko teraz. Skopiuj je przed zamknięciem okna.",
    temporaryPassword,
    expiresAt: expiresAt.toISOString(),
  };
}
