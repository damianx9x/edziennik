export const CONTRACT_LEGAL_CHECKLIST_VERSION = "kla-contract-checklist-2026-v1";
export const CONTRACT_ACCEPTANCE_STATEMENT_VERSION = "kla-documentary-2026-v2";

export function getContractAcceptanceStatement(input: {
  title: string;
  version: number;
  serviceSummary: string;
  paymentSummary: string | null;
  requiresPayment: boolean;
}): string {
  const base = `Potwierdzam, że przed złożeniem oświadczenia otrzymałem/am i przeczytałem/am umowę „${input.title}”, wersja ${input.version}, dotyczącą: ${input.serviceSummary}. Akceptuję dokładnie tę wersję dokumentu.`;

  if (!input.requiresPayment) return base;

  return `${base} Wiem, że zawarcie umowy wiąże się z obowiązkiem zapłaty na zasadach: ${input.paymentSummary ?? "opisanych w umowie"}.`;
}

export function getContractActionLabel(requiresPayment: boolean): string {
  return requiresPayment
    ? "Zamówienie z obowiązkiem zapłaty"
    : "Akceptuję umowę";
}
