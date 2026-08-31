export type AuditEventTone = "neutral" | "success" | "warning" | "critical";

const moduleLabels: Record<string, string> = {
  announcements: "Ogłoszenia",
  contracts: "Umowy",
  groups: "Grupy",
  identity: "Konta i dostęp",
  imports: "Import i eksport",
  learning: "Materiały i zadania",
  messages: "Wiadomości",
  payments: "Płatności",
  progress: "Postępy ucznia",
  records: "Kartoteki",
  schedule: "Grafik i lekcje",
  site: "Strona szkoły",
  system: "Serwer i konfiguracja",
};

const actionLabels: Record<string, string> = {
  "announcements.sent": "Wysłano ogłoszenie",
  "contracts.package.sent": "Wysłano pakiet umowy",
  "contracts.package_document.viewed": "Wyświetlono dokument umowy",
  "contracts.reminder.sent": "Wysłano przypomnienie o umowie",
  "contracts.signed_file.approved": "Zatwierdzono podpisany dokument",
  "contracts.signed_file.downloaded": "Pobrano podpisany dokument",
  "contracts.signed_file.rejected": "Odrzucono podpisany dokument",
  "contracts.signed_file.uploaded": "Wgrano podpisany dokument",
  "identity.password_reset.requested_by_director": "Dyrektor rozpoczął reset hasła",
  "identity.password_reset.requested": "Rozpoczęto bezpieczny reset hasła",
  "learning.homework.reviewed": "Sprawdzono zadanie domowe",
  "learning.homework.submitted": "Oddano zadanie domowe",
  "learning.material.published": "Opublikowano materiał",
  "messages.attachment.downloaded": "Pobrano załącznik rozmowy",
  "messages.direct_conversation.created": "Utworzono rozmowę",
  "messages.sent": "Wysłano wiadomość",
  "payments.installment_status.changed": "Zmieniono status raty",
  "schedule.change-request.rejected": "Odrzucono propozycję zmiany grafiku",
  "schedule.cancellation_sms.queued": "Zlecono SMS o odwołaniu zajęć",
  "schedule.cancellation_sms.skipped": "Pominięto SMS o odwołaniu zajęć",
  "site.content.reset": "Przywrócono treść strony",
  "site.content.updated": "Zmieniono treść strony",
  "system.import.restore_requested": "Zlecono odtworzenie kopii",
  "system.import.upload_started": "Rozpoczęto import kopii",
  "system.import.verified": "Zweryfikowano kopię przed importem",
};

export function getAuditModule(action: string): string {
  const prefix = action.split(".", 1)[0] ?? "other";
  return moduleLabels[prefix] ?? "Pozostałe";
}

export function getAuditActionLabel(action: string): string {
  return actionLabels[action] ?? action
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" · ");
}

export function getAuditEventTone(action: string): AuditEventTone {
  if (/(failed|rejected|denied|blocked|malware|breach)/i.test(action)) return "critical";
  if (/(skipped|cancelled|archived|deleted|revoked|reset)/i.test(action)) return "warning";
  if (/(approved|verified|published|sent|created|completed|restored)/i.test(action)) return "success";
  return "neutral";
}
