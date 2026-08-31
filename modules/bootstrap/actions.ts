"use server";

import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import nodemailer from "nodemailer";
import { z } from "zod";

import { auth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { readRecoveryKeyOnce } from "@/modules/system-owner/server-control";
import { setSmtpConfiguration } from "@/modules/system-owner/server-control";

import { firstRunSchema, type FirstRunState } from "./schema";
import {
  isSetupCodeValid,
  isTransactionalEmailConfigured,
  maskEmail,
} from "./security";

const BOOTSTRAP_LOCK_ID = 4_918_202_026;

export type FirstRunSmtpState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const firstRunSmtpSchema = z.object({
  setupCode: z.string().min(20).max(200),
  testEmail: z.email("Podaj adres, na który ma przyjść test."),
  from: z.email("Podaj sam adres nadawcy, bez dodatkowego opisu."),
  host: z.string().min(3).max(255).regex(/^[A-Za-z0-9.-]+$/, "Niepoprawny host SMTP."),
  port: z.enum(["465", "587"]),
  user: z.string().min(1).max(255),
  password: z.string().min(1).max(500),
});

export async function configureFirstRunSmtp(
  _previous: FirstRunSmtpState,
  formData: FormData,
): Promise<FirstRunSmtpState> {
  const parsed = firstRunSmtpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Sprawdź dane poczty." };
  }
  if (!isSetupCodeValid(parsed.data.setupCode, process.env.KLA_BOOTSTRAP_TOKEN_HASH)) {
    return { status: "error", message: "Kod instalacyjny jest nieprawidłowy." };
  }
  const ownerExists = await db.user.count({ where: { role: "SYSTEM_OWNER" } });
  if (ownerExists > 0) {
    return { status: "error", message: "Pierwsza konfiguracja została już zakończona." };
  }

  const port = Number(parsed.data.port);
  const transport = nodemailer.createTransport({
    host: parsed.data.host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: parsed.data.user, pass: parsed.data.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
  try {
    await transport.verify();
    await transport.sendMail({
      from: parsed.data.from,
      to: parsed.data.testEmail,
      subject: "Test pierwszego uruchomienia eDziennika KLA",
      text: "Wysyłka działa. Wróć do kreatora, odśwież stronę i utwórz konto właściciela.",
    });
    await setSmtpConfiguration({
      from: parsed.data.from,
      host: parsed.data.host,
      port: parsed.data.port,
      user: parsed.data.user,
      password: parsed.data.password,
    });
    return {
      status: "success",
      message: "Test dotarł do serwera pocztowego. Ustawienia zapisano; odczekaj 10 sekund i odśwież stronę.",
    };
  } catch {
    return {
      status: "error",
      message: "Test SMTP nie przeszedł. Sprawdź host, port, login i hasło aplikacji. Żadne ustawienie nie zostało zapisane.",
    };
  } finally {
    transport.close();
  }
}

export async function createFirstOwner(
  _previous: FirstRunState,
  formData: FormData,
): Promise<FirstRunState> {
  const parsed = firstRunSchema.safeParse({
    setupCode: formData.get("setupCode"),
    schoolName: formData.get("schoolName"),
    ownerName: formData.get("ownerName"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
    acceptedSecurityNotice: formData.get("acceptedSecurityNotice"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Sprawdź zaznaczone pola.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (
    !isSetupCodeValid(
      parsed.data.setupCode,
      process.env.KLA_BOOTSTRAP_TOKEN_HASH,
    )
  ) {
    return {
      status: "error",
      message: "Kod instalacyjny jest nieprawidłowy.",
    };
  }

  const emailReady = isTransactionalEmailConfigured();

  const userId = randomUUID();
  const schoolId = randomUUID();
  const passwordHash = await hashPassword(parsed.data.password);

  try {
    await db.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${BOOTSTRAP_LOCK_ID})`;
      const existingOwner = await transaction.user.count({
        where: { role: "SYSTEM_OWNER" },
      });
      if (existingOwner > 0) throw new Error("FIRST_RUN_ALREADY_COMPLETED");

      await transaction.school.create({
        data: {
          id: schoolId,
          name: parsed.data.schoolName,
          slug: "kings-language-academy",
        },
      });
      await transaction.user.create({
        data: {
          id: userId,
          schoolId,
          email: parsed.data.email,
          name: parsed.data.ownerName,
          role: "SYSTEM_OWNER",
          status: "ACTIVE",
          // Jednorazowy kod instalacyjny potwierdza fizyczną kontrolę nad
          // serwerem. Dzięki temu poczta nie blokuje uruchomienia nowej,
          // pustej instalacji. Dostawca e-mail nadal jest wymagany przed
          // wysyłaniem zaproszeń i odzyskiwaniem dostępu.
          emailVerified: !emailReady,
          twoFactorEnabled: false,
        },
      });
      await transaction.account.create({
        data: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: passwordHash,
        },
      });
      await transaction.auditLog.create({
        data: {
          id: randomUUID(),
          schoolId,
          actorId: userId,
          action: "system.first-run.owner-created",
          entityType: "User",
          entityId: userId,
          metadata: {
            emailVerificationRequired: emailReady,
            activationMode: emailReady ? "email" : "bootstrap-code",
            mfaRequired: true,
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FIRST_RUN_ALREADY_COMPLETED") {
      return {
        status: "error",
        message: "Pierwsza konfiguracja została już zakończona. Przejdź do logowania.",
      };
    }
    return {
      status: "error",
      message: "Nie udało się utworzyć konta. Żadne dane nie zostały częściowo zapisane.",
    };
  }

  let recoveryKey: string | undefined;
  let recoveryKeyWarning: string | undefined;
  try {
    recoveryKey = await readRecoveryKeyOnce();
  } catch {
    recoveryKeyWarning = "Klucz odzyskiwania nie został jeszcze pobrany. Po zalogowaniu zapisz go jednorazowo z panelu serwera przed dodaniem danych szkoły.";
  }

  if (!emailReady) {
    return {
      status: "success",
      activationMode: "bootstrap",
      message:
        "Konto zostało utworzone kodem instalacyjnym. Zaloguj się i skonfiguruj MFA. Wysyłkę e-mail możesz podłączyć później w ustawieniach serwera.",
      email: maskEmail(parsed.data.email),
      recoveryKey,
      recoveryKeyWarning,
    };
  }

  try {
    await auth.api.sendVerificationEmail({
      body: {
        email: parsed.data.email,
        callbackURL: "/panel/logowanie?aktywacja=1",
      },
    });
  } catch {
    return {
      status: "error",
      message:
        "Konto zapisano, ale wysyłka wiadomości nie powiodła się. Spróbuj zalogować się podanym adresem — system ponowi wysyłkę aktywacji.",
      email: maskEmail(parsed.data.email),
    };
  }

  return {
    status: "success",
    activationMode: "email",
    message:
      "Konto zostało utworzone. Otwórz wiadomość aktywacyjną, a następnie zaloguj się i skonfiguruj MFA.",
    email: maskEmail(parsed.data.email),
    recoveryKey,
    recoveryKeyWarning,
  };
}

export async function resendFirstOwnerActivation(
  _previous: FirstRunState,
  formData: FormData,
): Promise<FirstRunState> {
  const setupCode = String(formData.get("setupCode") ?? "").trim();
  if (!isSetupCodeValid(setupCode, process.env.KLA_BOOTSTRAP_TOKEN_HASH)) {
    return { status: "error", message: "Kod instalacyjny jest nieprawidłowy." };
  }
  if (!isTransactionalEmailConfigured()) {
    return {
      status: "error",
      message: "Wysyłka e-mail nie jest jeszcze skonfigurowana.",
    };
  }

  const owner = await db.user.findFirst({
    where: { role: "SYSTEM_OWNER", emailVerified: false },
    select: { email: true },
  });
  if (!owner) {
    return {
      status: "error",
      message: "Nie ma konta oczekującego na aktywację.",
    };
  }

  try {
    await auth.api.sendVerificationEmail({
      body: {
        email: owner.email,
        callbackURL: "/panel/logowanie?aktywacja=1",
      },
    });
    return {
      status: "success",
      message: "Nowa wiadomość aktywacyjna została wysłana.",
      email: maskEmail(owner.email),
    };
  } catch {
    return {
      status: "error",
      message: "Nie udało się wysłać wiadomości. Sprawdź konfigurację poczty.",
    };
  }
}
