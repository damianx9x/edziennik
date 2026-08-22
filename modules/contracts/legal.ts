export const CONTRACT_LEGAL_CHECKLIST_VERSION = "kla-contract-checklist-2026-v2";
export const CONTRACT_ACCEPTANCE_STATEMENT_VERSION = "kla-documentary-2026-v3";
export const CONTRACT_CONSUMER_NOTICE_VERSION = "kla-consumer-notice-2026-v1";

export const CONTRACT_LEGAL_REVIEW_DATE = "22 sierpnia 2026";

export const CONTRACT_CONSUMER_NOTICE =
  "Umowa jest zawierana na odległość. Co do zasady konsument może odstąpić od niej w ciągu 14 dni od zawarcia, bez podawania przyczyny. Jeżeli na wyraźne żądanie rodzica świadczenie rozpocznie się wcześniej, po odstąpieniu szkoła może rozliczyć część usługi wykonaną do tej chwili. Prawo odstąpienia może wygasnąć po pełnym wykonaniu usługi tylko po spełnieniu warunków ustawowych. Szczegółowe zasady i formularz odstąpienia muszą znajdować się w przekazanym dokumencie.";

export function getContractAcceptanceStatement(input: {
  title: string;
  version: number;
  serviceSummary: string;
  paymentSummary: string | null;
  paymentAmountCents?: number | null;
  paymentLabel?: string | null;
  paymentDueDate?: string | null;
  requiresPayment: boolean;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
  cancellationSummary?: string | null;
  requiresEarlyStartRequest: boolean;
}): string {
  const period = [input.serviceStartDate, input.serviceEndDate]
    .filter(Boolean)
    .join(" – ");
  const base = `Potwierdzam, że przed złożeniem oświadczenia otrzymałem/am i przeczytałem/am umowę „${input.title}”, wersja ${input.version}, dotyczącą: ${input.serviceSummary}${period ? `, okres: ${period}` : ""}. Akceptuję dokładnie tę wersję dokumentu. Zasady czasu trwania i zakończenia: ${input.cancellationSummary || "opisane w umowie"}.`;

  const earlyStartStatement = input.requiresEarlyStartRequest
    ? " Na moje wyraźne żądanie świadczenie może rozpocząć się przed upływem terminu na odstąpienie, z konsekwencjami opisanymi w informacji konsumenckiej."
    : "";

  if (!input.requiresPayment) return `${base}${earlyStartStatement}`;

  const structuredTerms = [
    input.paymentLabel,
    typeof input.paymentAmountCents === "number"
      ? `${(input.paymentAmountCents / 100).toFixed(2).replace(".", ",")} zł brutto`
      : null,
    input.paymentDueDate ? `termin ${input.paymentDueDate}` : null,
  ].filter(Boolean).join(", ");
  const terms = [structuredTerms, input.paymentSummary].filter(Boolean).join("; ");

  const paymentStatement = ` Wiem, że zawarcie umowy wiąże się z obowiązkiem zapłaty na zasadach: ${terms || "opisanych w umowie"}.`;
  return `${base}${paymentStatement}${earlyStartStatement}`;
}

export function getContractActionLabel(requiresPayment: boolean): string {
  return requiresPayment
    ? "Zamówienie z obowiązkiem zapłaty"
    : "Akceptuję umowę";
}
