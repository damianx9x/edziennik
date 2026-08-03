import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";

import { db } from "@/lib/server/db";
import {
  identityAccessControl,
  identityRoles,
} from "@/modules/identity/auth/access";
import {
  requireCanonicalAuthUrl,
  sendAuthEmail,
} from "@/modules/identity/email/email-provider";

const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const rateLimitStorage =
  process.env.KLA_AUTH_RATE_LIMIT_STORAGE === "memory"
    ? "memory"
    : "database";

export const auth = betterAuth({
  appName: "eDziennik King’s Language Academy",
  baseURL: baseUrl,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  trustedOrigins: [baseUrl],
  advanced: {
    database: {
      generateId: "uuid",
    },
    cookiePrefix: "kla",
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const safeUrl = requireCanonicalAuthUrl(url);
      await sendAuthEmail({
        to: user.email,
        subject: "Ustaw nowe hasło do eDziennika King’s",
        text: [
          `Dzień dobry ${user.name},`,
          "",
          "Otrzymaliśmy prośbę o ustawienie nowego hasła.",
          `Otwórz bezpieczny link: ${safeUrl}`,
          "",
          "Jeśli to nie Ty, zignoruj tę wiadomość.",
          "King’s Language Academy",
        ].join("\n"),
        category: "password-reset",
      });
    },
  },
  emailVerification: {
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      const safeUrl = requireCanonicalAuthUrl(url);
      await sendAuthEmail({
        to: user.email,
        subject: "Potwierdź adres e-mail w eDzienniku King’s",
        text: [
          `Dzień dobry ${user.name},`,
          "",
          `Potwierdź swój adres: ${safeUrl}`,
          "",
          "King’s Language Academy",
        ].join("\n"),
        category: "verification",
      });
    },
  },
  user: {
    modelName: "User",
    additionalFields: {
      schoolId: {
        type: "string",
        required: true,
        input: false,
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "INVITED",
        input: false,
      },
    },
  },
  session: {
    modelName: "Session",
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  account: {
    modelName: "Account",
  },
  verification: {
    modelName: "Verification",
    storeIdentifier: "hashed",
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    storage: rateLimitStorage,
    modelName: "RateLimit",
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 5,
      },
      "/request-password-reset": {
        window: 60 * 10,
        max: 3,
      },
    },
  },
  plugins: [
    admin({
      ac: identityAccessControl,
      roles: identityRoles,
      defaultRole: "PARENT",
    }),
    twoFactor({
      issuer: "King’s Language Academy",
      accountLockout: {
        enabled: true,
        maxFailedAttempts: 5,
        durationSeconds: 15 * 60,
      },
    }),
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session & {
  user: typeof auth.$Infer.Session.user & {
    role?: string | null;
    schoolId?: string | null;
    status?: string | null;
    twoFactorEnabled?: boolean | null;
  };
};
