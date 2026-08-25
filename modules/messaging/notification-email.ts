type NotificationKind = "CHAT" | "ANNOUNCEMENT";
type NotificationEnvironment = Partial<
  Record<"NEXT_PUBLIC_APP_URL" | "BETTER_AUTH_URL", string>
>;

function safeMessagesUrl(environment: NotificationEnvironment): string | null {
  const configured =
    environment.NEXT_PUBLIC_APP_URL ?? environment.BETTER_AUTH_URL;
  if (!configured) return null;

  try {
    const url = new URL(configured);
    const isLocalDevelopment =
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (url.protocol !== "https:" && !isLocalDevelopment) return null;
    return new URL("/panel/wiadomosci", url.origin).toString();
  } catch {
    return null;
  }
}

/**
 * E-mail jest tylko sygnałem o nowym zdarzeniu. Prywatna treść pozostaje
 * wyłącznie w eDzienniku, gdzie obowiązuje sesja i kontrola uprawnień.
 */
export function buildGenericMessageEmail(
  kind: NotificationKind,
  environment: NotificationEnvironment = process.env as NotificationEnvironment,
) {
  const isAnnouncement = kind === "ANNOUNCEMENT";
  const messagesUrl = safeMessagesUrl(environment);
  return {
    subject: isAnnouncement
      ? "KLA: nowe ogłoszenie w eDzienniku"
      : "KLA: nowa wiadomość w eDzienniku",
    text: [
      isAnnouncement
        ? "W eDzienniku King’s Language Academy czeka nowe ogłoszenie."
        : "W eDzienniku King’s Language Academy czeka nowa wiadomość.",
      "",
      "Ze względu na prywatność treść jest dostępna dopiero po zalogowaniu.",
      ...(messagesUrl ? [`Otwórz wiadomości: ${messagesUrl}`] : []),
      "",
      "King’s Language Academy",
    ].join("\n"),
  };
}
