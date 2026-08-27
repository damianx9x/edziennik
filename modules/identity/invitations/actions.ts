"use server";

import { auth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { hashPassword } from "better-auth/crypto";
import { revalidatePath } from "next/cache";
import { isInvitableIdentityRole } from "@/modules/identity/auth/access";
import { requireDirector } from "@/modules/identity/auth/session";
import { sendAuthEmail } from "@/modules/identity/email/email-provider";
import { resolveEmailProvider } from "@/modules/identity/email/provider-config";

import {
  acceptInvitationSchema,
  createInvitationSchema,
  createRoleQrInvitationSchema,
  doesInvitationVerifyEmail,
  getExistingInvitationAccountReuse,
  invitationRoleLabels,
  isSyntheticDemoEmail,
  revokeInvitationSchema,
} from "./schema";
import {
  createInvitationToken,
  hashInvitationToken,
  maskEmail,
} from "./token";
import type { InvitationActionState } from "./state";

function firstIssueMessage(
  error: { issues: readonly { message: string }[] },
  fallback: string,
): string {
  return error.issues[0]?.message ?? fallback;
}

function getAppOrigin(): string {
  const value =
    process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!value) {
    throw new Error("Brak skonfigurowanego adresu aplikacji.");
  }

  return new URL(value).origin;
}

async function invitationRateLimit(invitedById: string): Promise<boolean> {
  const recentInvitationCount = await db.invitation.count({
    where: {
      invitedById,
      createdAt: {
        gte: new Date(Date.now() - 10 * 60 * 1000),
      },
    },
  });
  return recentInvitationCount < 20;
}

export async function createInvitationAction(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const session = await requireDirector();
  const parsed = createInvitationSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: firstIssueMessage(
        parsed.error,
        "Sprawdź dane i spróbuj ponownie.",
      ),
    };
  }

  if (!(await invitationRateLimit(session.user.id))) {
    return {
      status: "error",
      message:
        "Wysłano dużo zaproszeń. Odczekaj 10 minut i spróbuj ponownie.",
    };
  }

  const existingUser = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      schoolId: true,
      role: true,
      archivedAt: true,
      status: true,
      accounts: { select: { id: true } },
    },
  });

  const existingAccountReuse = getExistingInvitationAccountReuse(
    existingUser,
    {
      schoolId: session.user.schoolId,
      role: parsed.data.role,
      kind: "EMAIL",
    },
  );

  if (existingUser && !existingAccountReuse) {
    return {
      status: "error",
      message:
        existingUser.schoolId === session.user.schoolId &&
        existingUser.role !== parsed.data.role
          ? "Ten adres jest już przypisany do innej roli w kartotece. Sprawdź rolę osoby przed wysłaniem zaproszenia."
          : existingUser.schoolId !== session.user.schoolId
            ? "Ten adres jest już używany przez inne konto."
            : "Ten adres ma już konto z danymi logowania. Użyj resetu hasła albo sprawdź kartotekę.",
    };
  }

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await db.$transaction(async (transaction) => {
    await transaction.invitation.updateMany({
      where: {
        schoolId: session.user.schoolId,
        email: parsed.data.email,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return transaction.invitation.create({
      data: {
        schoolId: session.user.schoolId,
        invitedById: session.user.id,
        kind: "EMAIL",
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        tokenHash,
        expiresAt,
      },
      select: { id: true },
    });
  });

  const invitationLink = new URL(
    `/zaproszenie/${token}`,
    getAppOrigin(),
  ).toString();

  let emailSent = false;
  try {
    emailSent =
      (await sendAuthEmail({
        to: parsed.data.email,
        subject: "Zaproszenie do eDziennika King’s",
        text: [
          `Dzień dobry ${parsed.data.name},`,
          "",
          `King’s Language Academy zaprasza Cię do konta: ${invitationRoleLabels[parsed.data.role]}.`,
          `Ustaw swoje hasło: ${invitationLink}`,
          "",
          "Link jest jednorazowy i ważny przez 7 dni.",
          "King’s Language Academy",
        ].join("\n"),
        category: "invitation",
      })) === "sent";
  } catch {
    console.error(
      JSON.stringify({
        event: "invitation.email.failed",
        invitationId: invitation.id,
      }),
    );
  }

  await db.auditLog.create({
    data: {
      schoolId: session.user.schoolId,
      actorId: session.user.id,
      action: "identity.invitation.created",
      entityType: "Invitation",
      entityId: invitation.id,
      metadata: {
        role: parsed.data.role,
        expiresAt: expiresAt.toISOString(),
        emailSent,
      },
    },
  });
  revalidatePath("/panel/szkola/zaproszenia");

  return {
    status: "success",
    message: emailSent
      ? `Zaproszenie wysłane do ${maskEmail(parsed.data.email)}.`
      : "Zaproszenie utworzone. E-mail nie jest jeszcze skonfigurowany — skopiuj bezpieczny link poniżej.",
    invitationLink,
    emailSent,
    invitationKind: "EMAIL",
    roleLabel: invitationRoleLabels[parsed.data.role],
    expiresAt: expiresAt.toISOString(),
  };
}

export async function createRoleQrInvitationAction(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const session = await requireDirector();
  const parsed = createRoleQrInvitationSchema.safeParse({
    role: formData.get("role"),
    validity: formData.get("validity"),
    usageLimit: formData.get("usageLimit"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: firstIssueMessage(parsed.error, "Wybierz rolę i czas ważności."),
    };
  }

  if (!(await invitationRateLimit(session.user.id))) {
    return {
      status: "error",
      message:
        "Utworzono dużo zaproszeń. Odczekaj 10 minut i spróbuj ponownie.",
    };
  }

  const validityMilliseconds = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
  } as const;
  const token = createInvitationToken();
  const expiresAt = new Date(
    Date.now() + validityMilliseconds[parsed.data.validity],
  );
  const invitation = await db.invitation.create({
    data: {
      schoolId: session.user.schoolId,
      invitedById: session.user.id,
      kind: "ROLE_QR",
      role: parsed.data.role,
      tokenHash: hashInvitationToken(token),
      expiresAt,
      maxUses: parsed.data.usageLimit === "once" ? 1 : null,
    },
    select: { id: true },
  });
  const invitationLink = new URL(
    `/zaproszenie/${token}`,
    getAppOrigin(),
  ).toString();

  await db.auditLog.create({
    data: {
      schoolId: session.user.schoolId,
      actorId: session.user.id,
      action: "identity.role_qr.created",
      entityType: "Invitation",
      entityId: invitation.id,
      metadata: {
        role: parsed.data.role,
        expiresAt: expiresAt.toISOString(),
        usageLimit: parsed.data.usageLimit,
      },
    },
  });
  revalidatePath("/panel/szkola/zaproszenia");

  return {
    status: "success",
    message: `Kod dla roli „${invitationRoleLabels[parsed.data.role]}” jest gotowy. ${parsed.data.usageLimit === "once" ? "Może zostać użyty tylko raz." : "Może tworzyć kolejne konta aż do wygaśnięcia."}`,
    invitationLink,
    invitationKind: "ROLE_QR",
    roleLabel: invitationRoleLabels[parsed.data.role],
    expiresAt: expiresAt.toISOString(),
  };
}

export async function revokeInvitationAction(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const session = await requireDirector();
  const parsed = revokeInvitationSchema.safeParse({
    invitationId: formData.get("invitationId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Nie rozpoznano zaproszenia. Odśwież stronę i spróbuj ponownie.",
    };
  }

  const revoked = await db.invitation.updateMany({
    where: {
      id: parsed.data.invitationId,
      schoolId: session.user.schoolId,
      acceptedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  if (revoked.count === 1) {
    await db.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        actorId: session.user.id,
        action: "identity.invitation.revoked",
        entityType: "Invitation",
        entityId: parsed.data.invitationId,
      },
    });
    revalidatePath("/panel/szkola/zaproszenia");
    return {
      status: "success",
      message: "Zaproszenie zostało cofnięte.",
    };
  }

  return {
    status: "error",
    message:
      "Tego zaproszenia nie można już cofnąć. Mogło zostać użyte lub cofnięte w innej karcie. Odśwież stronę.",
  };
}

export async function acceptInvitationAction(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const parsed = acceptInvitationSchema.safeParse({
    token: formData.get("token"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: firstIssueMessage(
        parsed.error,
        "Sprawdź dane i spróbuj ponownie.",
      ),
    };
  }

  const tokenHash = hashInvitationToken(parsed.data.token);
  const invitation = await db.invitation.findUnique({
    where: { tokenHash },
  });

  if (
    !invitation ||
    !isInvitableIdentityRole(invitation.role) ||
    (invitation.maxUses !== null && invitation.useCount >= invitation.maxUses) ||
    invitation.revokedAt ||
    invitation.expiresAt.getTime() <= Date.now()
  ) {
    return {
      status: "error",
      message:
        "Ten link jest nieważny, wygasł albo został już użyty. Poproś szkołę o nowe zaproszenie.",
    };
  }

  const email =
    invitation.kind === "EMAIL" ? invitation.email : parsed.data.email;
  if (!email) {
    return {
      status: "error",
      message: "Zaproszenie nie zawiera adresu e-mail. Poproś szkołę o nowe.",
    };
  }
  if (invitation.kind === "EMAIL" && email !== parsed.data.email) {
    return {
      status: "error",
      message:
        "Adres e-mail nie pasuje do zaproszenia. Użyj adresu, na który szkoła wysłała link.",
    };
  }

  const existingUser = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      schoolId: true,
      archivedAt: true,
      status: true,
      role: true,
      accounts: {
        select: { id: true, providerId: true },
      },
    },
  });

  const existingAccountReuse = getExistingInvitationAccountReuse(
    existingUser,
    {
      schoolId: invitation.schoolId,
      role: invitation.role,
      kind: invitation.kind,
    },
  );
  if (existingUser && !existingAccountReuse) {
    return {
      status: "error",
      message:
        existingUser.schoolId === invitation.schoolId &&
        existingUser.role !== invitation.role
          ? "Ten adres jest przypisany do innej roli. Poproś szkołę o sprawdzenie kartoteki."
          : "Konto dla tego adresu już istnieje. Przejdź do logowania lub ustaw nowe hasło.",
    };
  }

  const fullName =
    `${parsed.data.firstName.trim()} ${parsed.data.lastName.trim()}`.trim();
  const isSyntheticTestEnvironment =
    process.env.KLA_MAC_TEST_HOST === "1" ||
    process.env.NODE_ENV === "development";
  if (
    invitation.kind === "ROLE_QR" &&
    isSyntheticTestEnvironment &&
    !isSyntheticDemoEmail(email)
  ) {
    return {
      status: "error",
      message:
        "To środowisko testowe nie przyjmuje prawdziwych danych. Użyj fikcyjnego adresu kończącego się na @invalid.example.",
    };
  }
  const emailVerified =
    doesInvitationVerifyEmail(invitation.kind) ||
    (isSyntheticTestEnvironment && isSyntheticDemoEmail(email));
  const claimedAt = new Date();
  const claimed = await db.invitation.updateMany({
    where: {
      id: invitation.id,
      revokedAt: null,
      expiresAt: { gt: claimedAt },
      OR: [{ maxUses: null }, { useCount: { lt: invitation.maxUses ?? 1 } }],
    },
    data: {
      useCount: { increment: 1 },
      acceptedAt: invitation.maxUses === 1 ? claimedAt : null,
    },
  });

  if (claimed.count !== 1) {
    return {
      status: "error",
      message:
        "Ten link został właśnie użyty. Jeśli to nie Ty, skontaktuj się ze szkołą.",
    };
  }

  try {
    if (existingUser && existingAccountReuse) {
      const passwordHash = await hashPassword(parsed.data.password);
      await db.$transaction(async (transaction) => {
        await transaction.session.deleteMany({
          where: { userId: existingUser.id },
        });
        await transaction.twoFactor.deleteMany({
          where: { userId: existingUser.id },
        });
        const activated = await transaction.user.updateMany({
          where: {
            id: existingUser.id,
            schoolId: invitation.schoolId,
            role: invitation.role,
            ...(existingAccountReuse === "INVITED_RECORD"
              ? {
                  status: "INVITED",
                  archivedAt: null,
                  accounts: { none: {} },
                }
              : {
                  OR: [
                    { status: "ARCHIVED" },
                    { archivedAt: { not: null } },
                  ],
                }),
          },
          data: {
            name: fullName,
            phone: parsed.data.phone || null,
            status: "ACTIVE",
            archivedAt: null,
            banned: false,
            banReason: null,
            banExpires: null,
            emailVerified,
            twoFactorEnabled: false,
          },
        });
        if (activated.count !== 1) {
          throw new Error("Stan konta zmienił się podczas aktywacji.");
        }
        const credentialAccount = existingUser.accounts.find(
          (account) => account.providerId === "credential",
        );
        if (credentialAccount) {
          await transaction.account.update({
            where: { id: credentialAccount.id },
            data: { password: passwordHash },
          });
        } else {
          await transaction.account.create({
            data: {
              accountId: existingUser.id,
              providerId: "credential",
              userId: existingUser.id,
              password: passwordHash,
            },
          });
        }
        await transaction.invitation.update({
          where: { id: invitation.id },
          data: invitation.maxUses === 1 ? { acceptedUserId: existingUser.id } : {},
        });
        await transaction.auditLog.create({
          data: {
            schoolId: invitation.schoolId,
            actorId: existingUser.id,
            action:
              existingAccountReuse === "ARCHIVED_ACCOUNT"
                ? "identity.user.reactivated"
                : "identity.invitation.accepted",
            entityType:
              existingAccountReuse === "ARCHIVED_ACCOUNT"
                ? "User"
                : "Invitation",
            entityId:
              existingAccountReuse === "ARCHIVED_ACCOUNT"
                ? existingUser.id
                : invitation.id,
            metadata: { role: existingUser.role },
          },
        });
      });
      return {
        status: "success",
        message:
          existingAccountReuse === "ARCHIVED_ACCOUNT"
            ? "Konto zostało ponownie aktywowane. Możesz się teraz bezpiecznie zalogować."
            : "Konto jest gotowe. Możesz się teraz bezpiecznie zalogować.",
      };
    }

    const created = await auth.api.createUser({
      body: {
        email,
        password: parsed.data.password,
        name: fullName,
        role: invitation.role,
        data: {
          schoolId: invitation.schoolId,
          status: "ACTIVE",
        },
      },
    });

    await db.$transaction([
      db.user.update({
        where: { id: created.user.id },
        data: {
          schoolId: invitation.schoolId,
          status: "ACTIVE",
          emailVerified,
          phone: parsed.data.phone || null,
        },
      }),
      db.invitation.update({
        where: { id: invitation.id },
        data: invitation.maxUses === 1 ? { acceptedUserId: created.user.id } : {},
      }),
      db.auditLog.create({
        data: {
          schoolId: invitation.schoolId,
          actorId: created.user.id,
          action: "identity.invitation.accepted",
          entityType: "Invitation",
          entityId: invitation.id,
          metadata: { role: invitation.role },
        },
      }),
    ]);
  } catch {
    await db.invitation.updateMany({
      where: {
        id: invitation.id,
        ...(invitation.maxUses === 1 ? { acceptedAt: claimedAt, acceptedUserId: null } : {}),
      },
      data: {
        acceptedAt: invitation.maxUses === 1 ? null : undefined,
        useCount: { decrement: 1 },
      },
    });

    return {
      status: "error",
      message:
        "Nie udało się utworzyć konta. Spróbuj ponownie, a jeśli problem wróci — zgłoś go szkole.",
    };
  }

  if (!emailVerified) {
    const emailProviderConfigured = resolveEmailProvider() !== null;
    if (emailProviderConfigured) {
      try {
        await auth.api.sendVerificationEmail({
          body: { email, callbackURL: "/panel" },
        });
      } catch {
        return {
          status: "success",
          message:
            "Konto zostało zapisane, ale wiadomość potwierdzająca nie wyszła. Poproś szkołę o ponowienie wysyłki przed logowaniem.",
        };
      }
    }
    return {
      status: "success",
      message: emailProviderConfigured
        ? "Konto zostało zapisane. Otwórz wiadomość e-mail i potwierdź adres przed logowaniem."
        : "Konto zostało zapisane, ale wysyłka e-mail nie jest jeszcze skonfigurowana. Poproś szkołę o dokończenie aktywacji.",
    };
  }

  return {
    status: "success",
    message: "Konto jest gotowe. Możesz się teraz bezpiecznie zalogować.",
  };
}
