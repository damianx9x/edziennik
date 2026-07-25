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
const clientEvents: ClientDiagnosticEvent[] = [];

export function recordClientEvent(
  event: Omit<ClientDiagnosticEvent, "at" | "route"> & { route?: string },
) {
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
  return clientEvents.map((event) => ({ ...event }));
}
