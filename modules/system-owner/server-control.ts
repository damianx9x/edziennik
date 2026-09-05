import "server-only";

import { createConnection } from "node:net";
import type { RestartPolicy } from "./restart-policy";

export type RaspberryStatus = {
  available: boolean;
  hostname?: string;
  uptimeSeconds?: number;
  temperatureC?: number;
  throttledHex?: string;
  currentThrottling?: boolean | null;
  memoryControllerEnabled?: boolean;
  restartPolicy?: RestartPolicy;
  vaultRotational?: boolean | null;
  load?: number[];
  memory?: { total: number; available: number };
  rootDisk?: { total: number; used: number; free: number } | null;
  vaultDisk?: { total: number; used: number; free: number } | null;
  services?: Record<string, boolean>;
  latestBackupAt?: string;
  usbBackupPath?: string;
  sftpConfigured?: boolean;
  backupPolicy?: {
    frequency: "daily" | "weekly" | "manual";
    retentionDays: number;
  };
  emailConfigured?: boolean;
  publicPresentationMode?: "school" | "product";
  release?: {
    version: string;
    commit: string;
    auditedAt: string;
    vulnerabilities: {
      total: number;
      critical: number;
      high: number;
      moderate: number;
      low: number;
    };
  };
  autoUnlockEnabled?: boolean;
  startupProtection?: {
    vaultMounted: boolean;
    autoUnlockReady: boolean;
    hardwareWatchdog: boolean;
    persistentJournal: boolean;
    applicationRestart: boolean;
    tunnelRestart: boolean;
    healthTimer: boolean;
    backupTimer: boolean;
  };
  message?: string;
};

export type StorageDevice = {
  name: string;
  path: string;
  type: string;
  size: number;
  fstype?: string | null;
  label?: string | null;
  mountpoints?: Array<string | null>;
  tran?: string | null;
  rm?: boolean;
  hotplug?: boolean;
  children?: StorageDevice[];
};

export type FullExport = {
  id: string;
  filename: string;
  size: number;
  sha256: string;
  expiresAt: string;
};

export type SftpPreparation = {
  host: string;
  port: number;
  username: string;
  remotePath: string;
  fingerprint: string;
  publicKey: string;
};

export type ImportPreparation = {
  id: string;
  createdAt: string;
  sourceCommit: string;
  size: number;
  sha256: string;
};

function runControl(action: string, args: string[] = [], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = createConnection("/run/kla-web-control/control.sock");
    let settled = false;
    let response = "";
    const maxOutput = 256 * 1024;
    let outputExceeded = false;
    const timer = setTimeout(
      () => socket.destroy(new Error("Operacja przekroczyła bezpieczny limit czasu.")),
      action === "import-prepare" ? 300_000 : ["backup-now", "export-create", "benchmark-readonly"].includes(action) ? 180_000 : 20_000,
    );
    socket.setEncoding("utf8");
    socket.on("connect", () => socket.end(`${JSON.stringify({ action, args, input: input ?? "" })}\n`));
    socket.on("data", (chunk: string) => {
      response += chunk;
      if (response.length > maxOutput) { outputExceeded = true; socket.destroy(); }
    });
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };
    const succeed = (output: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(output);
    };
    socket.on("error", fail);
    socket.on("close", () => {
      if (settled) return;
      clearTimeout(timer);
      if (outputExceeded) { fail(new Error("Narzędzie serwera zwróciło zbyt dużo danych i zostało bezpiecznie zatrzymane.")); return; }
      try {
        const payload = JSON.parse(response.trim()) as { ok: boolean; stdout?: string; stderr?: string };
        if (payload.ok) succeed(payload.stdout?.trim() ?? "");
        else fail(new Error(payload.stderr?.trim() || payload.stdout?.trim() || "Polecenie serwera nie powiodło się."));
      } catch { fail(new Error("Usługa sterowania zwróciła nieprawidłową odpowiedź.")); }
    });
  });
}

export async function getRaspberryStatus(): Promise<RaspberryStatus> {
  try {
    return JSON.parse(await runControl("status-json")) as RaspberryStatus;
  } catch {
    return { available: false, message: "Panel urządzenia jest dostępny dopiero na serwerze Raspberry Pi." };
  }
}

export async function listMountedStorage(): Promise<StorageDevice[]> {
  try {
    const parsed = JSON.parse(await runControl("storage-json")) as { blockdevices?: StorageDevice[] };
    return parsed.blockdevices ?? [];
  } catch {
    return [];
  }
}

export async function setUsbBackupTarget(mountpoint: string): Promise<string> {
  return runControl("set-backup-usb", [mountpoint]);
}

export async function clearUsbBackupTarget(): Promise<string> {
  return runControl("clear-backup-usb");
}

export async function runBackupNow(): Promise<string> {
  return runControl("backup-now");
}

export async function restartApplication(): Promise<string> {
  return runControl("restart-app");
}

export async function setRestartPolicy(input: RestartPolicy): Promise<string> {
  return runControl("set-restart-policy", [], JSON.stringify(input));
}

export async function runReadonlyBenchmark(): Promise<string> {
  return runControl("benchmark-readonly");
}

export async function setBackupPolicy(input: {
  frequency: "daily" | "weekly" | "manual";
  retentionDays: 14 | 30 | 90;
}): Promise<string> {
  return runControl("set-backup-policy", [], JSON.stringify(input));
}

export async function prepareSftpBackup(input: {
  host: string;
  port: number;
  username: string;
  remotePath: string;
}): Promise<SftpPreparation> {
  return JSON.parse(await runControl("sftp-prepare", [], JSON.stringify(input))) as SftpPreparation;
}

export async function confirmSftpBackup(input: SftpPreparation): Promise<string> {
  return runControl("sftp-confirm", [], JSON.stringify(input));
}

export async function clearSftpBackup(): Promise<string> {
  return runControl("sftp-clear");
}

export async function createFullExport(id: string): Promise<FullExport> {
  return JSON.parse(await runControl("export-create", [id])) as FullExport;
}

export async function prepareFullImport(id: string, recoveryKey: string): Promise<ImportPreparation> {
  return JSON.parse(await runControl("import-prepare", [id], `${recoveryKey.trim()}\n`)) as ImportPreparation;
}

export async function restoreFullImport(id: string): Promise<string> {
  return runControl("import-restore", [id]);
}

export async function readRecoveryKeyOnce(): Promise<string> {
  const output = await runControl("recovery-key-first-run-once");
  const key = output.split(/\r?\n/).find((line) => line.startsWith("AGE-SECRET-KEY-"));
  if (!key) throw new Error("Serwer nie zwrócił prawidłowego klucza odzyskiwania.");
  return key;
}

export async function setSmtpConfiguration(input: {
  from: string;
  host: string;
  port: "465" | "587";
  user: string;
  password: string;
}): Promise<string> {
  return runControl("set-smtp", [], JSON.stringify(input));
}

export async function setSmsGateConfiguration(input: { username: string; password: string }): Promise<string> {
  return runControl("set-sms-gate", [], JSON.stringify(input));
}

export async function setPublicPresentationMode(mode: "school" | "product"): Promise<string> {
  return runControl("set-public-mode", [mode]);
}
