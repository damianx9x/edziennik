"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { getServerSession } from "@/modules/identity/auth/session";

export type TemporaryPasswordChangeState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const changeSchema = z
  .object({
    currentPassword: z.string().min(12).max(128),
    newPassword: z.string().min(12).max(128),
    confirmation: z.string().min(12).max(128),
  })
  .refine((value) => value.newPassword === value.confirmation, {
    path: ["confirmation"],
    message: "Hasła nie są takie same.",
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ["newPassword"],
    message: "Nowe hasło musi być inne niż hasło tymczasowe.",
  });

export async function completeTemporaryPasswordChangeAction(
  _: TemporaryPasswordChangeState,
  formData: FormData,
): Promise<TemporaryPasswordChangeState> {
  const session = await getServerSession();
  if (!session?.user.id || session.user.status !== "ACTIVE") {
    return { status: "error", message: "Sesja wygasła. Zaloguj się ponownie." };
  }

  const parsed = changeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Sprawdź wpisane hasła.",
    };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      schoolId: true,
      passwordChangeRequired: true,
      temporaryPasswordExpiresAt: true,
    },
  });
  if (!user?.passwordChangeRequired) {
    return { status: "success", message: "Hasło jest już aktualne." };
  }
  if (
    !user.temporaryPasswordExpiresAt ||
    user.temporaryPasswordExpiresAt.getTime() <= Date.now()
  ) {
    return {
      status: "error",
      message: "Hasło tymczasowe wygasło. Poproś dyrektora o wygenerowanie nowego.",
    };
  }

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
    });
    await db.$transaction([
      db.user.update({
        where: { id: session.user.id },
        data: {
          passwordChangeRequired: false,
          temporaryPasswordExpiresAt: null,
        },
      }),
      db.auditLog.create({
        data: {
          schoolId: user.schoolId,
          actorId: session.user.id,
          action: "identity.password_reset.temporary_completed",
          entityType: "User",
          entityId: session.user.id,
        },
      }),
    ]);
    return {
      status: "success",
      message: "Hasło zostało zmienione. Możesz przejść do swojego panelu.",
    };
  } catch {
    return {
      status: "error",
      message: "Hasło tymczasowe jest nieprawidłowe. Sprawdź je lub poproś o nowe.",
    };
  }
}
