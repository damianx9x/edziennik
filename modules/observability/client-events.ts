"use client";

import { sanitizeDiagnosticText } from "./sanitize";

export type ClientEventLevel = "info" | "warning" | "error";

export type ClientDiagnosticEvent = {
  at: string;
  code: string;
  level: ClientEventLevel;
  message?: string;
  route: string;
};

const maxEvents = 60;
const retentionMs = 30 * 60_000;
const clientEvents: ClientDiagnosticEvent[] = [];

function pruneEvents(now: number) {
  while (clientEvents.length && Date.parse(clientEvents[0].at) < now - retentionMs) clientEvents.shift();
}

export function recordClientEvent(
  event: Omit<ClientDiagnosticEvent, "at" | "route"> & { route?: string },
) {
  // Production diagnostics capture failures, not every click.
  if (event.level === "info") return;
  const now = Date.now();
  pruneEvents(now);
  const last = clientEvents.at(-1);
  if (last?.code === event.code && last.level === event.level && now - Date.parse(last.at) < 10_000) return;
  clientEvents.push({
    at: new Date().toISOString(),
    code: event.code.slice(0, 80),
    level: event.level,
    message: event.message
      ? sanitizeDiagnosticText(event.message)
      : undefined,
    route:
      event.route ??
      (typeof window === "undefined" ? "server" : window.location.pathname),
  });

  if (clientEvents.length > maxEvents) {
    clientEvents.splice(0, clientEvents.length - maxEvents);
  }
}

export function getClientEvents(): ClientDiagnosticEvent[] {
  pruneEvents(Date.now());
  return clientEvents.map((event) => ({ ...event }));
}
