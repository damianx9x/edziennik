"use client";

import { CircleHelp, FileStack, LoaderCircle, Search, Send } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { createContractPackageAction, reuseContractPackageAction } from "../actions";

type ParentOption = { id: string; name: string; status: string; children: { id: string; name: string }[] };

type PackageOption = { id: string; title: string; version: number; paymentSummary: string | null };

export function ContractCreateForm({ parents, packages }: { parents: ParentOption[]; packages: PackageOption[] }) {
  const [selectedParentId, setSelectedParentId] = useState("");
  const [parentQuery, setParentQuery] = useState("");
  const [requiresPayment, setRequiresPayment] = useState(true);
  const [count, setCount] = useState(10);
  const [amount, setAmount] = useState("350,00");
  const children = parents.find((parent) => parent.id === selectedParentId)?.children ?? [];
  const visibleParents = useMemo(() => {
    const normalized = parentQuery.trim().toLocaleLowerCase("pl-PL");
    const matching = normalized
      ? parents.filter((parent) =>
          `${parent.name} ${parent.children.map((child) => child.name).join(" ")}`
            .toLocaleLowerCase("pl-PL")
            .includes(normalized),
        )
      : parents.slice(0, 5);
    const selected = parents.find((parent) => parent.id === selectedParentId);
    return selected && !matching.some((parent) => parent.id === selected.id)
      ? [selected, ...matching]
      : matching;
  }, [parentQuery, parents, selectedParentId]);
  const calculatedTotal = useMemo(() => {
    const value = Number(amount.replace(",", "."));
    return Number.isFinite(value) ? (value * count).toFixed(2).replace(".", ",") : "";
  }, [amount, count]);
  const [state, action, pending] = useActionState(createContractPackageAction, { status: "idle" as const });
  const [reuseState, reuseAction, reusePending] = useActionState(reuseContractPackageAction, { status: "idle" as const });

  return (
    <div className="contract-create-stack">
    {parents.length > 5 ? <label className="relationship-search contract-parent-search"><Search aria-hidden="true" /><span className="sr-only">Szukaj rodzica lub ucznia</span><input type="search" value={parentQuery} onChange={(event) => setParentQuery(event.target.value)} placeholder="Szukaj rodzica albo dziecka" /><small>Na liście pokazujemy kilka podpowiedzi. Wpisz nazwisko, aby znaleźć pozostałe osoby.</small></label> : null}
    {packages.length ? <form action={reuseAction} className="stage4-form contract-package-reuse">
      <div className="stage4-form-heading"><span className="stage4-icon"><FileStack aria-hidden="true" /></span><div><span className="section-kicker">Najszybsza opcja</span><h2>Wyślij gotowy wariant ponownie</h2><p>Umowę, cennik, harmonogram i raty wgrywasz tylko raz.</p></div></div>
      <label>Gotowy pakiet<select name="sourceVersionId" required defaultValue=""><option value="" disabled>Wybierz wariant</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.title} · wersja {item.version}{item.paymentSummary ? ` · ${item.paymentSummary}` : ""}</option>)}</select></label>
      <div className="stage4-form-row"><label>Rodzic<select name="parentId" required value={selectedParentId} onChange={(event) => setSelectedParentId(event.target.value)}><option value="" disabled>Wybierz rodzica</option>{visibleParents.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}{parent.status === "INVITED" ? " · konto oczekuje" : ""}</option>)}</select></label><label>Uczeń<select name="studentId" required defaultValue="" disabled={!selectedParentId || children.length === 0}><option value="" disabled>{!selectedParentId ? "Najpierw wybierz rodzica" : children.length ? "Wybierz ucznia" : "Najpierw przypisz dziecko w Kartotekach"}</option>{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label><label>Termin odpowiedzi (opcjonalnie)<input name="expiresAt" type="date" /></label></div>
      {reuseState.message ? <p className={`stage4-feedback ${reuseState.status}`} role="status">{reuseState.message}</p> : null}
      <button className="stage4-primary" type="submit" disabled={reusePending}>{reusePending ? <LoaderCircle className="spin" /> : <Send />}{reusePending ? "Wysyłam…" : "Wyślij gotowy pakiet"}</button>
    </form> : null}
    <form action={action} className="stage4-form contract-package-form">
      <div className="stage4-form-heading">
        <span className="stage4-icon"><FileStack aria-hidden="true" /></span>
        <div><span className="section-kicker">Nowy pakiet dla rodzica</span><h2>Wgraj gotowe PDF-y i wyślij</h2><p>Nie przepisujesz treści umowy. Rodzic otrzyma dokładnie dokumenty przygotowane przez szkołę.</p></div>
        <Link className="contract-help-link" href="/panel/umowy/pomoc"><CircleHelp aria-hidden="true" /> Zasady prawne</Link>
      </div>
      <label>Nazwa pakietu<input name="title" required maxLength={120} placeholder="np. Pakiet standardowy 2026/27" /></label>
      <div className="contract-package-documents" aria-label="Trzy dokumenty dla rodzica">
        <label><strong>1. Umowa i informacje RODO</strong><input name="agreementDocument" type="file" required accept="application/pdf,.pdf" /><small>Umowa oraz obowiązek informacyjny szkoły w jednym PDF. Maks. 10 MB.</small></label>
        <label><strong>2. Cennik / kosztorys</strong><input name="priceListDocument" type="file" required accept="application/pdf,.pdf" /><small>Wariant obowiązujący tego ucznia.</small></label>
        <label><strong>3. Harmonogram zajęć</strong><input name="scheduleDocument" type="file" required accept="application/pdf,.pdf" /><small>Może zawierać kilka stron.</small></label>
      </div>
      <div className="stage4-form-row">
        <label>Rodzic<select name="parentId" required value={selectedParentId} onChange={(event) => setSelectedParentId(event.target.value)}><option value="" disabled>Wybierz rodzica</option>{visibleParents.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}{parent.status === "INVITED" ? " · konto oczekuje" : ""}</option>)}</select></label>
        <label>Uczeń<select name="studentId" required defaultValue="" disabled={!selectedParentId || children.length === 0}><option value="" disabled>{!selectedParentId ? "Najpierw wybierz rodzica" : children.length ? "Wybierz ucznia" : "Najpierw przypisz dziecko w Kartotekach"}</option>{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>
      </div>
      <fieldset className="stage4-payment-terms">
        <legend>Rozliczenie — tylko dane potrzebne do rat i przypomnień</legend>
        <label>Czy pakiet wiąże się z płatnością?<select name="requiresPayment" value={requiresPayment ? "yes" : "no"} onChange={(event) => setRequiresPayment(event.target.value === "yes")}><option value="yes">Tak</option><option value="no">Nie</option></select></label>
        {requiresPayment ? <>
          <div className="stage4-form-row stage4-payment-fields">
            <label>Liczba rat<input name="installmentCount" type="number" min={1} max={24} value={count} onChange={(event) => setCount(Number(event.target.value))} required /></label>
            <label>Kwota jednej raty<input name="installmentAmount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
            <label>Kwota całkowita<input name="totalAmount" inputMode="decimal" defaultValue={calculatedTotal} key={calculatedTotal} required /><small>Podpowiedź: {calculatedTotal || "—"} zł.</small></label>
            <label>Termin pierwszej raty<input name="firstPaymentDueDate" type="date" required /></label>
          </div>
          <p className="stage4-inline-info">Kolejne terminy powstaną automatycznie co miesiąc. Ostatnia rata wyrówna ewentualną różnicę do kwoty całkowitej.</p>
        </> : <><input type="hidden" name="installmentCount" value="1" /><input type="hidden" name="installmentAmount" value="1" /><input type="hidden" name="totalAmount" value="1" /><input type="hidden" name="firstPaymentDueDate" value="2026-09-01" /></>}
      </fieldset>
      <div className="stage4-form-row">
        <label>Jak rodzic ma zakończyć formalność?<select name="acceptanceMode" defaultValue="EXTERNAL_SIGNATURE" required><option value="EXTERNAL_SIGNATURE">Pobiera, podpisuje i wgrywa skan</option><option value="DOCUMENTARY">Akceptuje w eDzienniku — forma dokumentowa</option></select><small>Domyślny jest prosty wariant z podpisanym egzemplarzem.</small></label>
        <label>Termin odpowiedzi (opcjonalnie)<input name="expiresAt" type="date" /></label>
      </div>
      <label className="stage4-check stage4-legal-check"><input type="checkbox" name="legalReadiness" value="confirmed" required /><span>Sprawdziłem/am trzy PDF-y i sposób zawarcia. W trybie elektronicznym przycisk składa i utrwala oświadczenie woli oraz zawiera umowę w formie dokumentowej; nie jest podpisem odręcznym ani kwalifikowanym.</span></label>
      {parents.length === 0 ? <p className="stage4-feedback error" role="status">Nie ma jeszcze rodzica w Kartotekach. Dodaj lub zaproś rodzica, przypisz mu dziecko i wróć tutaj.</p> : selectedParentId && children.length === 0 ? <p className="stage4-feedback error" role="status">Ten rodzic nie ma przypisanego dziecka. Powiąż osoby w Kartotekach — wtedy uczeń pojawi się tutaj automatycznie.</p> : null}
      {state.message ? <p className={`stage4-feedback ${state.status}`} role="status">{state.message}</p> : null}
      <button className="stage4-primary" type="submit" disabled={pending || parents.length === 0}>{pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Send aria-hidden="true" />}{pending ? "Bezpiecznie zapisuję…" : "Wyślij komplet rodzicowi"}</button>
    </form></div>
  );
}
