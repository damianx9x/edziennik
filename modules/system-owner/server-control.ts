import "server-only";

import { spawn } from "node:child_process";

export type RaspberryStatus = {
  available: boolean;
  hostname?: string;
  uptimeSeconds?: number;
  temperatureC?: number;
  throttledHex?: string;
  currentThrottling?: boolean | null;
  memoryControllerEnabled?: boolean;
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
  autoUnlockEnabled?: boolean;
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
    const child = spawn("/usr/bin/sudo", ["-n", "/usr/local/sbin/kla-web-control", action, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" },
    });
    let stdout = "";
    let stderr = "";
    const maxOutput = 256 * 1024;
    let outputExceeded = false;
    const timer = setTimeout(
      () => child.kill("SIGKILL"),
      action === "import-prepare" ? 300_000 : ["backup-now", "export-create", "benchmark-readonly"].includes(action) ? 180_000 : 20_000,
    );
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    const append = (current: string, chunk: string) => {
      const next = current + chunk;
      if (next.length <= maxOutput) return next;
      outputExceeded = true;
      child.kill("SIGKILL");
      return next.slice(0, maxOutput);
    };
    child.stdout.on("data", (chunk: string) => { stdout = append(stdout, chunk); });
    child.stderr.on("data", (chunk: string) => { stderr = append(stderr, chunk); });
    child.on("error", reject);
    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      if (outputExceeded) reject(new Error("Narzędzie serwera zwróciło zbyt dużo danych i zostało bezpiecznie zatrzymane."));
      else if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || stdout.trim() || "Polecenie serwera nie powiodło się."));
    });
    child.stdin.end(input ?? "");
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
  const output = await runControl("recovery-key-once");
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
