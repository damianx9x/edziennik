"use client";

import { CircleHelp, FileUp, LoaderCircle, Send } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { createContractAssignmentAction } from "../actions";

type ParentOption = {
  id: string;
  name: string;
  children: { id: string; name: string }[];
};

export function ContractCreateForm({ parents }: { parents: ParentOption[] }) {
  const [selectedParentId, setSelectedParentId] = useState("");
  const [requiresPayment, setRequiresPayment] = useState(true);
  const availableChildren =
    parents.find((parent) => parent.id === selectedParentId)?.children ?? [];
  const [state, action, pending] = useActionState(
    createContractAssignmentAction,
    { status: "idle" as const },
  );

  return (
    <form action={action} className="stage4-form">
      <div className="stage4-form-heading">
        <span className="stage4-icon"><FileUp aria-hidden="true" /></span>
        <div>
          <span className="section-kicker">Nowa umowa</span>
          <h2>Wyślij dokładną wersję PDF</h2>
          <p>Dokument po wysłaniu nie jest edytowany. Korekta będzie nową wersją.</p>
        </div>
        <Link className="contract-help-link" href="/panel/umowy/pomoc">
          <CircleHelp aria-hidden="true" /> Zasady prawne i checklista
        </Link>
      </div>

      <label>
        Nazwa umowy
        <input name="title" required maxLength={120} placeholder="np. Umowa na rok szkolny 2026/27" />
      </label>
      <div className="stage4-form-row">
        <label>
          Jak rodzic ma zakończyć formalność?
          <select name="acceptanceMode" required defaultValue="DOCUMENTARY">
            <option value="DOCUMENTARY">Akceptacja w eDzienniku — forma dokumentowa</option>
            <option value="EXTERNAL_SIGNATURE">Tylko podgląd — podpis poza systemem</option>
          </select>
          <small>Jeśli umowa wymaga formy pisemnej, wybierz podpis poza systemem.</small>
        </label>
        <label>
          Czy umowa zobowiązuje rodzica do zapłaty?
          <select
            name="requiresPayment"
            value={requiresPayment ? "yes" : "no"}
            onChange={(event) => setRequiresPayment(event.target.value === "yes")}
          >
            <option value="yes">Tak — umowa odpłatna</option>
            <option value="no">Nie — bez obowiązku zapłaty</option>
          </select>
        </label>
      </div>
      <label>
        Najważniejszy zakres i okres usługi
        <textarea
          name="serviceSummary"
          required
          minLength={10}
          maxLength={500}
          rows={3}
          placeholder="np. Angielski dla grupy Toronto, 60 minut tygodniowo, od września 2026 do czerwca 2027"
        />
        <small>Rodzic zobaczy tę informację bezpośrednio przed decyzją.</small>
      </label>
      <fieldset className="stage4-payment-terms">
        <legend>Czas trwania i zakończenie umowy</legend>
        <div className="stage4-form-row">
          <label>
            Początek zajęć
            <input name="serviceStartDate" type="date" required />
          </label>
          <label>
            Koniec okresu umowy
            <input name="serviceEndDate" type="date" required />
          </label>
        </div>
        <label>
          Jak można zakończyć albo wypowiedzieć umowę?
          <textarea
            name="cancellationSummary"
            required
            minLength={10}
            maxLength={700}
            rows={3}
            placeholder="np. miesięczny okres wypowiedzenia ze skutkiem na koniec miesiąca; szczegóły w § 8 dokumentu"
          />
          <small>Ta informacja pojawi się tuż przed przyciskiem zawarcia umowy.</small>
        </label>
        <label>
          Czy poprosić rodzica o wcześniejsze rozpoczęcie zajęć?
          <select name="requiresEarlyStartRequest" defaultValue="no" required>
            <option value="no">Nie — zajęcia nie wymagają osobnego żądania</option>
            <option value="yes">Tak — mogą zacząć się przed upływem 14 dni</option>
          </select>
          <small>Wybierz „Tak” tylko wtedy, gdy rodzic ma wyraźnie zażądać rozpoczęcia usługi przed upływem terminu na odstąpienie.</small>
        </label>
      </fieldset>
      {requiresPayment ? (
        <fieldset className="stage4-payment-terms">
          <legend>Warunki płatności zapisane z tą wersją</legend>
          <div className="stage4-form-row stage4-payment-fields">
            <label>
              Kwota brutto (PLN)
              <input
                name="paymentAmount"
                required
                inputMode="decimal"
                placeholder="np. 320,00"
              />
            </label>
            <label>
              Nazwa płatności
              <input
                name="paymentLabel"
                required
                maxLength={80}
                placeholder="np. Czesne za wrzesień 2026"
              />
            </label>
            <label>
              Termin płatności
              <input name="paymentDueDate" type="date" required />
            </label>
          </div>
          <label>
            Pozostałe zasady płatności
            <textarea
              name="paymentSummary"
              required
              maxLength={500}
              rows={3}
              placeholder="np. przelewem na rachunek szkoły; dane do przelewu rodzic otrzyma osobno"
            />
            <small>Kwota i termin będą widoczne bezpośrednio przed akceptacją.</small>
          </label>
        </fieldset>
      ) : (
        <>
          <input type="hidden" name="paymentSummary" value="" />
          <input type="hidden" name="paymentAmount" value="" />
          <input type="hidden" name="paymentLabel" value="" />
          <input type="hidden" name="paymentDueDate" value="" />
        </>
      )}
      <div className="stage4-form-row">
        <label>
          Rodzic
          <select
            name="parentId"
            required
            value={selectedParentId}
            onChange={(event) => setSelectedParentId(event.target.value)}
          >
            <option value="" disabled>Wybierz rodzica</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>{parent.name}</option>
            ))}
          </select>
        </label>
        <label>
          Uczeń
          <select name="studentId" required defaultValue="" disabled={!selectedParentId}>
            <option value="" disabled>{selectedParentId ? "Wybierz ucznia" : "Najpierw wybierz rodzica"}</option>
            {availableChildren.map((child) => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>
          <small>System sprawdzi powiązanie z wybranym rodzicem.</small>
        </label>
      </div>

      <label className="stage4-check stage4-legal-check">
        <input type="checkbox" name="legalReadiness" value="confirmed" required />
        <span>
          Sprawdziłem/am treść, cenę, okres, informacje o odstąpieniu oraz to,
          czy dla tej umowy wystarcza forma dokumentowa. W razie wymogu formy
          pisemnej wybieram podpis poza systemem. Dokument zawiera również dane
          przedsiębiorcy, reklamację, prawo odstąpienia i formularz odstąpienia.
        </span>
      </label>
      <div className="stage4-form-row">
        <label>
          Dokument PDF
          <input name="document" type="file" required accept="application/pdf,.pdf" />
          <small>Maksymalnie 10 MB.</small>
        </label>
        <label>
          Ważna do (opcjonalnie)
          <input name="expiresAt" type="date" />
        </label>
      </div>

      {state.message ? (
        <p className={`stage4-feedback ${state.status}`} role="status">{state.message}</p>
      ) : null}
      <button className="stage4-primary" type="submit" disabled={pending || parents.length === 0}>
        {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
        {pending ? "Bezpiecznie zapisuję…" : "Wyślij rodzicowi"}
      </button>
    </form>
  );
}
