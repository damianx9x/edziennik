export const CONTRACT_LEGAL_CHECKLIST_VERSION = "kla-contract-checklist-2026-v2";
export const CONTRACT_ACCEPTANCE_STATEMENT_VERSION = "kla-documentary-2026-v5";
export const CONTRACT_CONSUMER_NOTICE_VERSION = "kla-consumer-notice-2026-v2";

export const CONTRACT_LEGAL_REVIEW_DATE = "27 sierpnia 2026";

export const CONTRACT_CONSUMER_NOTICE =
  "Umowa na kurs języka angielskiego jest zawierana na odległość. Rodzic otrzymuje przed decyzją umowę i informacje RODO, indywidualny kosztorys oraz harmonogram. Konsument może co do zasady odstąpić od umowy w ciągu 14 dni bez podawania przyczyny. Jeśli na jego wyraźne żądanie zajęcia rozpoczną się wcześniej, szkoła może rozliczyć usługę wykonaną do chwili odstąpienia. Pełne zasady, dane szkoły i formularz odstąpienia znajdują się w przekazanym pakiecie.";

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
  documentTitles?: string[];
  installmentCount?: number | null;
  installmentAmountCents?: number | null;
  totalAmountCents?: number | null;
}): string {
  const period = [input.serviceStartDate, input.serviceEndDate]
    .filter(Boolean)
    .join(" – ");
  const packageStatement = input.documentTitles?.length
    ? `otrzymałem/am i przeczytałem/am cały pakiet: ${input.documentTitles.join(", ")}`
    : `otrzymałem/am i przeczytałem/am umowę „${input.title}”`;
  const base = `Oświadczam, że chcę zawrzeć umowę z King’s Language Academy. Potwierdzam, że przed złożeniem oświadczenia ${packageStatement}, wersja ${input.version}, dotyczącą: ${input.serviceSummary}${period ? `, okres: ${period}` : ""}. Akceptuję dokładnie tę, niezmienną wersję dokumentów. Zasady czasu trwania i zakończenia są opisane w umowie${input.cancellationSummary ? `: ${input.cancellationSummary}` : "."} Akceptacja w eDzienniku utrwala moje oświadczenie w formie dokumentowej.`;

  const earlyStartStatement = input.requiresEarlyStartRequest
    ? " Na moje wyraźne żądanie świadczenie może rozpocząć się przed upływem terminu na odstąpienie, z konsekwencjami opisanymi w informacji konsumenckiej."
    : "";

  if (!input.requiresPayment) return `${base}${earlyStartStatement}`;

  const installmentTerms = input.installmentCount && input.installmentAmountCents
    ? `${input.installmentCount} rat po ${(input.installmentAmountCents / 100).toFixed(2).replace(".", ",")} zł${input.totalAmountCents ? `, łącznie ${(input.totalAmountCents / 100).toFixed(2).replace(".", ",")} zł` : ""}`
    : null;
  const structuredTerms = [
    installmentTerms,
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
