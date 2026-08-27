"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/app/generated/prisma/client";

import { db } from "@/lib/server/db";
import { requireSystemOwner } from "@/modules/identity/auth/session";
import {
  clearUsbBackupTarget,
  runBackupNow,
  setSmtpConfiguration,
  setSmsGateConfiguration,
  setUsbBackupTarget,
} from "./server-control";

export type ServerActionState = { status: "idle" | "success" | "error"; message?: string };
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
}

export async function backupNowAction(previous: ServerActionState): Promise<ServerActionState> {
  void previous;
  const session = await requireSystemOwner("/panel/bog");
  try {
    await runBackupNow();
    await audit(session.user.id, session.user.schoolId, "system.backup.manual_completed");
    revalidatePath("/panel/bog");
    return { status: "success", message: "Kopia i test odtworzenia zakończyły się poprawnie." };
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Backup nie powiódł się.");
  }
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
    const message = await setSmtpConfiguration(parsed.data);
    await audit(session.user.id, session.user.schoolId, "system.email.smtp_configured", { host: parsed.data.host, port: parsed.data.port, from: parsed.data.from });
    revalidatePath("/panel/bog");
    return { status: "success", message: `${message} Wyślij zaproszenie testowe, aby potwierdzić dostarczenie.` };
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
    return { status: "success", message };
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Nie udało się skonfigurować bramki SMS.");
  }
}
