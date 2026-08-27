"use server";

import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import { z } from "zod";
import type { Prisma } from "@/app/generated/prisma/client";

import { db } from "@/lib/server/db";
import { requireSystemOwner } from "@/modules/identity/auth/session";
import {
  clearUsbBackupTarget,
  clearSftpBackup,
  confirmSftpBackup,
  createFullExport,
  prepareSftpBackup,
  restartApplication,
  runBackupNow,
  setBackupPolicy,
  setSmtpConfiguration,
  setSmsGateConfiguration,
  setUsbBackupTarget,
} from "./server-control";

export type ServerActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  downloadUrl?: string;
  downloadName?: string;
  sha256?: string;
};
export type SftpActionState = ServerActionState & {
  preparation?: {
    host: string;
    port: number;
    username: string;
    remotePath: string;
    fingerprint: string;
    publicKey: string;
  };
};
const initialError = (message: string): ServerActionState => ({ status: "error", message });

async function audit(actorId: string, schoolId: string, action: string, metadata?: Record<string, unknown>) {
  await db.auditLog.create({ data: { actorId, schoolId, action, entityType: "RaspberryServer", metadata: metadata as Prisma.InputJsonValue | undefined } });
}

export async function configureUsbBackupAction(_: ServerActionState, formData: FormData): Promise<ServerActionState> {
  const session = await requireSystemOwner("/panel/bog");
  const parsed = z.string().min(1).max(500).safeParse(formData.get("mountpoint"));
  if (!parsed.success) return initialError("Wybierz wykryty i zamontowany dysk USB.");
  try {
    const message = await setUsbBackupTarget(parsed.data);
    await audit(session.user.id, session.user.schoolId, "system.backup.usb_configured", { mountpoint: parsed.data });
    revalidatePath("/panel/bog");
    revalidatePath("/panel/bog/ustawienia");
    revalidatePath("/panel/szkola/narzedzia");
    return { status: "success", message };
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Nie udało się ustawić dysku.");
  }
}

export async function clearUsbBackupAction(): Promise<void> {
  const session = await requireSystemOwner("/panel/bog");
  await clearUsbBackupTarget();
  await audit(session.user.id, session.user.schoolId, "system.backup.usb_disabled");
  revalidatePath("/panel/bog");
  revalidatePath("/panel/bog/ustawienia");
  revalidatePath("/panel/szkola/narzedzia");
}

export async function backupNowAction(previous: ServerActionState): Promise<ServerActionState> {
  void previous;
  const session = await requireSystemOwner("/panel/bog");
  try {
    await runBackupNow();
    await audit(session.user.id, session.user.schoolId, "system.backup.manual_completed");
    revalidatePath("/panel/bog");
    revalidatePath("/panel/bog/ustawienia");
    revalidatePath("/panel/szkola/narzedzia");
    return { status: "success", message: "Kopia i test odtworzenia zakończyły się poprawnie." };
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Backup nie powiódł się.");
  }
}

export async function restartApplicationAction(previous: ServerActionState): Promise<ServerActionState> {
  void previous;
  const session = await requireSystemOwner("/panel/bog/ustawienia");
  try {
    const message = await restartApplication();
    await audit(session.user.id, session.user.schoolId, "system.application.restart_requested");
    return { status: "success", message };
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Nie udało się zaplanować restartu aplikacji.");
  }
}

export async function prepareFullExportAction(previous: ServerActionState, formData: FormData): Promise<ServerActionState> {
  void previous;
  void formData;
  const session = await requireSystemOwner("/panel/bog");
  try {
    const id = crypto.randomUUID();
    const prepared = await createFullExport(id);
    await audit(session.user.id, session.user.schoolId, "system.export.full_prepared", {
      exportId: prepared.id,
      size: prepared.size,
      sha256: prepared.sha256,
    });
    return {
      status: "success",
      message: "Pełny, zaszyfrowany eksport jest gotowy. Link działa przez 24 godziny i obsługuje wznowienie pobierania.",
      downloadUrl: `/panel/bog/eksport/${prepared.id}`,
      downloadName: prepared.filename,
      sha256: prepared.sha256,
    };
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Nie udało się przygotować pełnego eksportu.");
  }
}

const backupPolicySchema = z.object({
  frequency: z.enum(["daily", "weekly", "manual"]),
  retentionDays: z.coerce.number().pipe(z.union([z.literal(14), z.literal(30), z.literal(90)])),
});

export async function configureBackupPolicyAction(_: ServerActionState, formData: FormData): Promise<ServerActionState> {
  const session = await requireSystemOwner("/panel/bog/ustawienia");
  const parsed = backupPolicySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError("Wybierz prawidłowy harmonogram i okres przechowywania.");
  try {
    const message = await setBackupPolicy(parsed.data);
    await audit(session.user.id, session.user.schoolId, "system.backup.policy_configured", parsed.data);
    revalidatePath("/panel/bog/ustawienia");
    revalidatePath("/panel/szkola/narzedzia");
    return { status: "success", message };
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Nie udało się zapisać harmonogramu.");
  }
}

const sftpSchema = z.object({
  host: z.string().min(1).max(255).regex(/^[A-Za-z0-9.-]+$/, "Niepoprawny adres serwera."),
  port: z.coerce.number().int().min(1).max(65_535),
  username: z.string().min(1).max(100).regex(/^[A-Za-z0-9._-]+$/, "Niepoprawny login SFTP."),
  remotePath: z.string().min(1).max(240).regex(/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]+$/, "Folder musi być ścieżką względną bez '..'."),
});

export async function prepareSftpAction(_: SftpActionState, formData: FormData): Promise<SftpActionState> {
  await requireSystemOwner("/panel/bog/ustawienia");
  const parsed = sftpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError(parsed.error.issues[0]?.message ?? "Sprawdź dane SFTP.");
  try {
    const preparation = await prepareSftpBackup(parsed.data);
    return {
      status: "success",
      message: "Serwer został odnaleziony. Porównaj odcisk i dodaj klucz publiczny po stronie SFTP.",
      preparation,
    };
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Nie udało się połączyć z serwerem SFTP.");
  }
}

export async function confirmSftpAction(_: ServerActionState, formData: FormData): Promise<ServerActionState> {
  const session = await requireSystemOwner("/panel/bog/ustawienia");
  const parsed = sftpSchema.extend({
    fingerprint: z.string().min(10).max(500),
    publicKey: z.string().min(20).max(2_000),
    confirmed: z.literal("yes"),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError("Potwierdź odcisk serwera i dodanie klucza publicznego.");
  try {
    const { confirmed: _confirmed, ...configuration } = parsed.data;
    void _confirmed;
    const message = await confirmSftpBackup(configuration);
    await audit(session.user.id, session.user.schoolId, "system.backup.sftp_configured", {
      host: configuration.host,
      port: configuration.port,
      remotePath: configuration.remotePath,
      fingerprint: configuration.fingerprint,
    });
    revalidatePath("/panel/bog/ustawienia");
    return { status: "success", message };
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Nie udało się aktywować SFTP.");
  }
}

export async function clearSftpAction(): Promise<void> {
  const session = await requireSystemOwner("/panel/bog/ustawienia");
  await clearSftpBackup();
  await audit(session.user.id, session.user.schoolId, "system.backup.sftp_disabled");
  revalidatePath("/panel/bog/ustawienia");
}

const smtpSchema = z.object({
  from: z.email("Podaj poprawny adres nadawcy."),
  host: z.string().min(3).max(255).regex(/^[A-Za-z0-9.-]+$/, "Niepoprawny host SMTP."),
  port: z.enum(["465", "587"]),
  user: z.string().min(1).max(255),
  password: z.string().min(1).max(500),
});

export async function configureSmtpAction(_: ServerActionState, formData: FormData): Promise<ServerActionState> {
  const session = await requireSystemOwner("/panel/bog");
  const parsed = smtpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError(parsed.error.issues[0]?.message ?? "Sprawdź dane SMTP.");
  try {
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
      await transport.sendMail({
        from: parsed.data.from,
        to: session.user.email,
        subject: "Test wysyłki eDziennika KLA",
        text: "Wysyłka e-mail z eDziennika KLA działa poprawnie. Możesz teraz wysyłać zaproszenia i powiadomienia.",
      });
    } finally {
      transport.close();
    }
    const message = await setSmtpConfiguration(parsed.data);
    await audit(session.user.id, session.user.schoolId, "system.email.smtp_configured", { host: parsed.data.host, port: parsed.data.port, from: parsed.data.from });
    revalidatePath("/panel/bog");
    revalidatePath("/panel/bog/ustawienia");
    return { status: "success", message: `${message} Wiadomość testowa została wysłana na adres Twojego konta.` };
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Nie udało się zapisać SMTP.");
  }
}

export async function configureSmsGateAction(_: ServerActionState, formData: FormData): Promise<ServerActionState> {
  const session = await requireSystemOwner("/panel/bog");
  const parsed = z.object({ username: z.string().min(1).max(255), password: z.string().min(1).max(500) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError("Podaj login i hasło z aplikacji SMS Gateway for Android.");
  try {
    const message = await setSmsGateConfiguration(parsed.data);
    await audit(session.user.id, session.user.schoolId, "system.sms.gateway_configured");
    revalidatePath("/panel/bog");
    revalidatePath("/panel/bog/ustawienia");
    return { status: "success", message };
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Nie udało się skonfigurować bramki SMS.");
  }
}
