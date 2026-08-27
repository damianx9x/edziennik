import "server-only";

import { spawn } from "node:child_process";

export type RaspberryStatus = {
  available: boolean;
  hostname?: string;
  uptimeSeconds?: number;
  temperatureC?: number;
  load?: number[];
  memory?: { total: number; available: number };
  rootDisk?: { total: number; used: number; free: number } | null;
  vaultDisk?: { total: number; used: number; free: number } | null;
  services?: Record<string, boolean>;
  latestBackupAt?: string;
  usbBackupPath?: string;
  emailConfigured?: boolean;
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

function runControl(action: string, args: string[] = [], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/sudo", ["-n", "/usr/local/sbin/kla-web-control", action, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" },
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), action === "backup-now" ? 120_000 : 20_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code: number | null) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout.trim());
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
