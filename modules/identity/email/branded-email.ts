type EmailContent = { subject: string; text: string; category: "verification" | "password-reset" | "invitation" | "message" };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export function renderBrandedEmail(message: EmailContent, origin: string): string {
  const canonical = new URL(origin);
  const urls = message.text.match(/https?:\/\/[^\s<>"']+/g) ?? [];
  const actionUrl = urls.find((value) => {
    try { return new URL(value).origin === canonical.origin; } catch { return false; }
  }) ?? new URL(message.category === "message" ? "/panel/wiadomosci" : "/panel/logowanie", canonical).href;
  const labels = { verification: "Potwierdź adres e-mail", "password-reset": urls.length ? "Ustaw nowe hasło" : "Przejdź do logowania", invitation: "Aktywuj moje konto", message: "Otwórz wiadomości" };
  const body = message.text.split(/\n\s*\n/).map((paragraph) => `<p style="margin:0 0 18px;line-height:1.7;color:#303b57">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`).join("");
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f4f2ed;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#18264f;padding:28px 28px 24px;border-bottom:5px solid #ce2446"><div style="font-size:30px;font-weight:bold;color:#fff">King’s</div><div style="font-size:14px;color:#fff;letter-spacing:1px">LANGUAGE ACADEMY</div></td></tr>
<tr><td style="padding:28px"><h1 style="font-size:24px;line-height:1.35;color:#18264f;margin:0 0 24px">${escapeHtml(message.subject)}</h1>${body}
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#ce2446" style="border-radius:10px"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:16px 24px;border:1px solid #ce2446;border-radius:10px;color:#fff;font-size:16px;font-weight:bold;text-decoration:none">${labels[message.category]}</a></td></tr></table>
<p style="font-size:13px;line-height:1.6;color:#566078;margin-top:24px">Jeśli przycisk nie działa, skopiuj ten adres do przeglądarki:<br><a href="${escapeHtml(actionUrl)}" style="color:#244c9a;word-break:break-all">${escapeHtml(actionUrl)}</a></p></td></tr>
<tr><td style="padding:20px 28px;background:#f6f7fa;color:#566078;font-size:12px;line-height:1.6">King’s Language Academy · eDziennik<br>Wiadomość dotycząca Twojego konta lub spraw szkolnych. Nie udostępniaj innym linków do aktywacji konta i zmiany hasła.</td></tr>
</table></td></tr></table></body></html>`;
}
