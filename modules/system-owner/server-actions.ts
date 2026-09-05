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
  runReadonlyBenchmark,
  runBackupNow,
  setBackupPolicy,
  setRestartPolicy,
  setSmtpConfiguration,
  setSmsGateConfiguration,
  setPublicPresentationMode,
  setUsbBackupTarget,
} from "./server-control";
import { summarizeBenchmark } from "./benchmark-result";
import { restartPolicySchema } from "./restart-policy";

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

export async function configureRestartPolicyAction(_: ServerActionState, formData: FormData): Promise<ServerActionState> {
  const session = await requireSystemOwner("/panel/bog/ustawienia");
  const parsed = restartPolicySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return initialError(parsed.error.issues[0]?.message ?? "Sprawdź harmonogram restartu.");
  const { frequency, hour, minute } = parsed.data;
  try {
    // Record intent before invoking the privileged broker; never perform an unaudited change.
    await audit(session.user.id, session.user.schoolId, "system.restart.policy_requested", { frequency, hour, minute });
    const message = await setRestartPolicy({ frequency, hour, minute });
    await audit(session.user.id, session.user.schoolId, "system.restart.policy_configured", { frequency, hour, minute });
    revalidatePath("/panel/bog/ustawienia");
    return { status: "success", message };
  } catch {
    return initialError("Nie udało się potwierdzić harmonogramu. Odśwież ustawienia i sprawdź zapisany stan.");
  }
}

export async function runReadonlyBenchmarkAction(previous: ServerActionState): Promise<ServerActionState> {
  void previous;
  const session = await requireSystemOwner("/panel/bog/ustawienia");
  try {
    const raw = await runReadonlyBenchmark();
    const result = summarizeBenchmark(raw);
    await audit(session.user.id, session.user.schoolId, "system.benchmark.readonly_completed", result);
    const prefix = result.status === "ok" ? "Pomiar zakończony" : "Pomiar zatrzymany przez próg ochronny";
    return { status: result.status === "ok" ? "success" : "error", message: `${prefix}: szczyt ${result.peakRequestsPerSecond.toFixed(1)} ż./s, najgorsze p95 ${result.worstP95Ms.toFixed(1)} ms, nieoczekiwane błędy ${result.unexpectedErrors}, kontrolowane 429 ${result.throttledResponses}. Test działał wyłącznie lokalnie i niczego nie zapisywał.` };
  } catch (error) {
    return initialError(error instanceof Error ? error.message : "Benchmark został bezpiecznie przerwany.");
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

function smtpErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const responseCode = typeof error === "object" && error && "responseCode" in error ? Number(error.responseCode) : 0;
  if (["EAUTH", "535"].includes(code) || responseCode === 535) return "Serwer odrzucił login lub hasło. Wpisz pełny adres skrzynki i jej aktualne hasło albo hasło aplikacji.";
  if (["ECONNECTION", "ETIMEDOUT", "ECONNREFUSED"].includes(code)) return "Nie udało się połączyć z serwerem SMTP. Sprawdź adres serwera, port i dostęp Raspberry do internetu.";
  if (responseCode === 550 || responseCode === 553) return "Serwer nie pozwolił wysłać z podanego adresu. Adres nadawcy powinien należeć do zalogowanej skrzynki.";
  if (code === "ESOCKET") return "Nie udało się uzgodnić bezpiecznego połączenia TLS. Sprawdź, czy port 587 używa STARTTLS, a 465 SSL/TLS.";
  return "Test SMTP nie powiódł się. Sprawdź dane skrzynki i spróbuj ponownie.";
}

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
      await transport.verify();
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
    return initialError(smtpErrorMessage(error));
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

export async function configurePublicPresentationAction(_: ServerActionState, formData: FormData): Promise<ServerActionState> {
  const session = await requireSystemOwner("/panel/bog/ustawienia");
  const parsed = z.enum(["school", "product"]).safeParse(formData.get("mode"));
  if (!parsed.success) return initialError("Wybierz prawidłowy tryb publicznej wizytówki.");
  try {
    await audit(session.user.id, session.user.schoolId, "site.public_presentation.requested", { mode: parsed.data });
  } catch {
    return initialError("Nie udało się bezpiecznie zapisać prośby o zmianę. Nic nie zmieniono.");
  }

  let message: string;
  try {
    message = await setPublicPresentationMode(parsed.data);
  } catch (error) {
    await audit(session.user.id, session.user.schoolId, "site.public_presentation.failed", { mode: parsed.data }).catch(() => undefined);
    return initialError(
      error instanceof Error
        ? `${error.message} Nic nie zmieniono.`
        : "Nie udało się przełączyć strony. Nic nie zmieniono.",
    );
  }

  // Zapis żądania istnieje już przed zmianą systemu. Jeżeli drugi wpis audytu
  // chwilowo zawiedzie, nie wolno fałszywie powiedzieć, że przełączenie się nie
  // odbyło — operator nadal ma ślad żądania i prawidłowy komunikat o stanie.
  await audit(session.user.id, session.user.schoolId, "site.public_presentation.applied", { mode: parsed.data }).catch(() => undefined);
  try {
    revalidatePath("/");
    revalidatePath("/panel/bog/ustawienia");
    return {
      status: "success",
      message:
        parsed.data === "product"
          ? `${message} Osoby bez logowania widzą teraz pokaz systemu.`
          : `${message} Osoby bez logowania widzą teraz stronę szkoły.`,
    };
  } catch {
    return { status: "success", message: `${message} Odśwież publiczną stronę, aby zobaczyć zmianę.` };
  }
}
