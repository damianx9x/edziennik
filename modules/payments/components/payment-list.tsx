"use client";

import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Eye,
  GripHorizontal,
  LoaderCircle,
  Pencil,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type MouseEvent,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useMovableDialog } from "@/modules/records/components/use-movable-dialog";

import { savePaymentStatusAction } from "../actions";
import {
  paymentDisplayStatusLabels,
  paymentStatusLabels,
  type PaymentDisplayStatus,
} from "../schema";

type StoredPaymentStatus = "UNSET" | "PENDING" | "PAID" | "OVERDUE";
type PaymentFilter = "ALL" | "ACTION" | "PAID" | "WAITING";

type PaymentItem = {
  itemId: string;
  installmentId: string | null;
  assignmentId: string;
  parentId: string;
  parentName: string;
  studentName: string;
  contractTitle: string;
  contractVersion: number;
  installmentNumber: number | null;
  installmentCount: number | null;
  totalAmountCents: number | null;
  contractStatus: "DRAFT" | "SENT" | "VIEWED" | "SIGNED_PENDING_REVIEW" | "ACCEPTED" | "EXPIRED";
  acceptedAt: string | null;
  paymentLabel: string;
  paymentAmountCents: number | null;
  paymentSummary: string | null;
  dueDate: string | null;
  storedStatus: StoredPaymentStatus | null;
  displayStatus: PaymentDisplayStatus;
  updatedAt: string | null;
  changedByName: string | null;
  note: string | null;
};

type PaymentAssignmentSummary = {
  assignmentId: string;
  representative: PaymentItem;
  installments: PaymentItem[];
  paidCount: number;
  totalCount: number;
};

function formatDate(value: string | null, includeTime = false): string {
  if (!value) return "Nie ustawiono";
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" } : {}),
  }).format(new Date(value));
}

function formatAmount(value: number | null): string {
  if (value === null) return "Kwota nie została ustrukturyzowana";
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(value / 100);
}

function StatusIcon({ status }: { status: PaymentDisplayStatus }) {
  if (status === "PAID") return <CheckCircle2 aria-hidden="true" />;
  if (status === "OVERDUE" || status === "CONTRACT_EXPIRED") {
    return <CircleAlert aria-hidden="true" />;
  }
  return <CalendarClock aria-hidden="true" />;
}

export function PaymentList({
  items,
  isManagement,
  initialSelectedId,
}: {
  items: PaymentItem[];
  isManagement: boolean;
  initialSelectedId?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const { startDrag, resetDialogPosition } = useMovableDialog(dialogRef);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  useEffect(() => {
    const initialItem = items.find(
      (item) =>
        item.itemId === initialSelectedId ||
        item.installmentId === initialSelectedId ||
        item.assignmentId === initialSelectedId,
    );
    if (!initialItem || dialogRef.current?.open) return;
    setSelectedAssignmentId(initialItem.itemId);
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }, [initialSelectedId, items]);
  const selected = useMemo(
    () => items.find((item) => item.itemId === selectedAssignmentId) ?? null,
    [items, selectedAssignmentId],
  );
  const selectedInstallments = useMemo(
    () =>
      selected
        ? items
            .filter((item) => item.assignmentId === selected.assignmentId)
            .sort(
              (first, second) =>
                (first.installmentNumber ?? 0) -
                (second.installmentNumber ?? 0),
            )
        : [],
    [items, selected],
  );
  const [filter, setFilter] = useState<PaymentFilter>("ALL");
  const [query, setQuery] = useState("");
  const assignmentSummaries = useMemo(() => {
    const grouped = new Map<string, PaymentItem[]>();
    for (const item of items) {
      const current = grouped.get(item.assignmentId) ?? [];
      current.push(item);
      grouped.set(item.assignmentId, current);
    }
    return [...grouped.entries()].map(([assignmentId, installments]) => {
      const sorted = [...installments].sort(
        (first, second) =>
          (first.installmentNumber ?? 0) - (second.installmentNumber ?? 0),
      );
      const representative =
        sorted.find((item) => item.displayStatus !== "PAID") ?? sorted[0];
      return {
        assignmentId,
        representative,
        installments: sorted,
        paidCount: sorted.filter((item) => item.displayStatus === "PAID").length,
        totalCount: sorted.length,
      } satisfies PaymentAssignmentSummary;
    });
  }, [items]);
  const visibleAssignments = useMemo(
    () =>
      assignmentSummaries.filter((assignment) => {
        const needle = query.trim().toLocaleLowerCase("pl");
        const person = assignment.representative;
        if (needle && !`${person.parentName} ${person.studentName} ${person.contractTitle}`.toLocaleLowerCase("pl").includes(needle)) return false;
        const statuses = assignment.installments.map((item) => item.displayStatus);
        if (filter === "ALL") return true;
        if (filter === "PAID") return statuses.every((status) => status === "PAID");
        if (filter === "ACTION") {
          return statuses.some((status) =>
            ["UNSET", "PENDING", "OVERDUE"].includes(status),
          );
        }
        return statuses.some((status) =>
          ["WAITING_SIGNATURE", "CONTRACT_EXPIRED"].includes(status),
        );
      }),
    [assignmentSummaries, filter, query],
  );
  const groups = useMemo(() => {
    if (!isManagement) return [{ id: "mine", name: "", items: visibleAssignments }];
    const grouped = new Map<string, { id: string; name: string; items: PaymentAssignmentSummary[] }>();
    for (const item of visibleAssignments) {
      const person = item.representative;
      const group = grouped.get(person.parentId) ?? {
        id: person.parentId,
        name: person.parentName,
        items: [],
      };
      group.items.push(item);
      grouped.set(person.parentId, group);
    }
    return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [isManagement, visibleAssignments]);

  const counts = useMemo(() => ({
    ALL: assignmentSummaries.length,
    ACTION: assignmentSummaries.filter((assignment) => assignment.installments.some((item) => ["UNSET", "PENDING", "OVERDUE"].includes(item.displayStatus))).length,
    PAID: assignmentSummaries.filter((assignment) => assignment.installments.every((item) => item.displayStatus === "PAID")).length,
    WAITING: assignmentSummaries.filter((assignment) => assignment.installments.some((item) => ["WAITING_SIGNATURE", "CONTRACT_EXPIRED"].includes(item.displayStatus))).length,
  }), [assignmentSummaries]);

  function open(item: PaymentItem, event: MouseEvent<HTMLButtonElement>) {
    lastTriggerRef.current = event.currentTarget;
    setSelectedAssignmentId(item.itemId);
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }

  function close() {
    dialogRef.current?.close();
  }

  function restoreFocus() {
    resetDialogPosition();
    setSelectedAssignmentId(null);
    lastTriggerRef.current?.focus();
  }

  return (
    <>
      {isManagement ? <label className="payment-search"><span>Szukaj rodzica, ucznia lub umowy</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Np. Kowalska albo pakiet 2026/27" /></label> : null}
      <nav className="payment-filters" aria-label="Filtruj rozliczenia">
        {([
          ["ALL", "Wszystkie"],
          ["ACTION", "Do sprawdzenia"],
          ["PAID", "Opłacone"],
          ["WAITING", "Czekają na umowę"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? "active" : ""}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            <span>{label}</span><strong>{counts[value]}</strong>
          </button>
        ))}
      </nav>
      <div className="payment-parent-groups">
        {groups.map((group) => (
          <section className="payment-parent-group" key={group.id}>
            {isManagement ? (
              <header>
                <div className="contract-parent-avatar" aria-hidden="true">
                  {group.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <span className="section-kicker">Rodzic</span>
                  <h3>{group.name}</h3>
                </div>
                <strong>{group.items.length} {group.items.length === 1 ? "rozliczenie" : "rozliczeń"}</strong>
              </header>
            ) : null}
            <div className="payment-list">
              {group.items.map((summary) => {
                const item = summary.representative;
                return (
                <article key={summary.assignmentId}>
                  <button
                    type="button"
                    className="payment-row-open"
                    onClick={(event) => open(item, event)}
                    aria-label={`Pokaż płatność z umowy ${item.contractTitle}`}
                  >
                    <span className={`payment-status payment-${item.displayStatus.toLowerCase()}`}>
                      <StatusIcon status={item.displayStatus} />
                      {paymentDisplayStatusLabels[item.displayStatus]}
                    </span>
                    <span className="payment-row-copy">
                      <strong>{item.contractTitle}</strong>
                      <span>{item.studentName} · {summary.paidCount} z {summary.totalCount} rat opłaconych</span>
                      <small>
                        {item.displayStatus === "PAID"
                          ? "Wszystkie raty rozliczone"
                          : `Najbliższa pozycja: ${formatAmount(item.paymentAmountCents)} · ${formatDate(item.dueDate)}`}
                      </small>
                    </span>
                    <Eye aria-hidden="true" />
                  </button>
                </article>
              );})}
            </div>
          </section>
        ))}
        {visibleAssignments.length === 0 ? (
          <div className="payment-filter-empty">
            <CheckCircle2 aria-hidden="true" />
            <strong>Brak pozycji w tym widoku</strong>
            <span>Wybierz inny filtr, aby zobaczyć pozostałe umowy.</span>
          </div>
        ) : null}
      </div>

      <dialog
        ref={dialogRef}
        className="stage4-preview-dialog payment-preview-dialog"
        onClose={restoreFocus}
        aria-labelledby="payment-preview-title"
      >
        {selected ? (
          <div className="stage4-preview-shell">
            <header className="stage4-preview-header stage4-dialog-drag-handle" onPointerDown={startDrag}>
              <GripHorizontal className="stage4-dialog-grip" aria-label="Przeciągnij, aby przesunąć okno" />
              <div>
                <span className="section-kicker">{selected.installmentNumber ? `Rata ${selected.installmentNumber} z ${selected.installmentCount}` : "Płatność z umowy"} · wersja {selected.contractVersion}</span>
                <h2 id="payment-preview-title">{selected.contractTitle}</h2>
                <p>{selected.studentName}{isManagement ? ` · ${selected.parentName}` : ""}</p>
              </div>
              <button type="button" onClick={close} aria-label="Zamknij szczegóły">
                <X aria-hidden="true" />
              </button>
            </header>
            <div className="payment-preview-body">
              <span className={`payment-status payment-${selected.displayStatus.toLowerCase()}`}>
                <StatusIcon status={selected.displayStatus} />
                {paymentDisplayStatusLabels[selected.displayStatus]}
              </span>
              {selectedInstallments.length > 1 ? (
                <section className="payment-installment-overview" aria-labelledby="payment-installments-title">
                  <div className="person-dialog-section-heading">
                    <h3 id="payment-installments-title">Harmonogram rat</h3>
                    <span>
                      {selectedInstallments.filter((item) => item.displayStatus === "PAID").length} z {selectedInstallments.length} opłaconych
                    </span>
                  </div>
                  <div className="payment-installment-list">
                    {selectedInstallments.map((installment) => (
                      <button
                        key={installment.itemId}
                        type="button"
                        className={installment.itemId === selected.itemId ? "active" : ""}
                        aria-pressed={installment.itemId === selected.itemId}
                        onClick={() => setSelectedAssignmentId(installment.itemId)}
                      >
                        <span>
                          <strong>Rata {installment.installmentNumber}</strong>
                          <small>{formatDate(installment.dueDate)}</small>
                        </span>
                        <span>
                          <strong>{formatAmount(installment.paymentAmountCents)}</strong>
                          <small>{paymentDisplayStatusLabels[installment.displayStatus]}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              <dl className="stage4-preview-facts">
                <div><dt>Kwota tej raty</dt><dd>{formatAmount(selected.paymentAmountCents)}</dd></div>
                <div><dt>Termin raty</dt><dd>{formatDate(selected.dueDate)}</dd></div>
                <div><dt>Plan</dt><dd>{selected.paymentLabel}</dd></div>
                {selected.totalAmountCents ? <div><dt>Kwota całkowita</dt><dd>{formatAmount(selected.totalAmountCents)}</dd></div> : null}
                <div><dt>Akceptacja rodzica</dt><dd>{formatDate(selected.acceptedAt, true)}</dd></div>
                {selected.updatedAt ? <div><dt>Ostatnia zmiana statusu</dt><dd>{formatDate(selected.updatedAt, true)}</dd></div> : null}
                {isManagement && selected.changedByName ? <div><dt>Zmienił/a</dt><dd>{selected.changedByName}</dd></div> : null}
              </dl>
              {selected.paymentSummary ? (
                <section className="payment-contract-terms">
                  <h3>Pozostałe warunki z umowy</h3>
                  <p>{selected.paymentSummary}</p>
                </section>
              ) : null}
              {isManagement && selected.contractStatus === "ACCEPTED" ? (
                <PaymentStatusEditor
                  key={`${selected.assignmentId}-${selected.storedStatus}-${selected.updatedAt}`}
                  item={selected}
                />
              ) : isManagement ? (
                <p className="stage4-legal-note">
                  Status rozliczenia będzie można ustawić po zaakceptowaniu umowy przez rodzica.
                </p>
              ) : null}
              <p className="stage4-privacy-note">
                <ShieldCheck aria-hidden="true" /> Kwota i termin pochodzą z niezmiennej wersji umowy. Edycja tych warunków wymaga wysłania rodzicowi nowej wersji dokumentu.
              </p>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

function PaymentStatusEditor({ item }: { item: PaymentItem }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(savePaymentStatusAction, {
    status: "idle" as const,
  });
  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.status]);

  const defaultStatus: StoredPaymentStatus =
    item.storedStatus ?? (item.displayStatus === "OVERDUE" ? "OVERDUE" : "PENDING");

  return (
    <form action={action} className="payment-status-editor">
      <div className="person-dialog-section-heading">
        <h3><Pencil aria-hidden="true" /> Edytuj status</h3>
        <span>Zapis bezpośredni dyrektora</span>
      </div>
      <input type="hidden" name="contractAssignmentId" value={item.assignmentId} />
      <input type="hidden" name="paymentInstallmentId" value={item.installmentId ?? ""} />
      <div className="payment-status-editor-grid">
        <label>
          Status rozliczenia
          <select name="status" defaultValue={defaultStatus}>
            {Object.entries(paymentStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Notatka administracyjna
          <textarea name="note" defaultValue={item.note ?? ""} maxLength={240} rows={3} placeholder="Opcjonalnie — bez danych rachunku i treści przelewu" />
        </label>
      </div>
      {state.message ? <p className={`stage4-feedback ${state.status}`} role="status">{state.message}</p> : null}
      <button className="stage4-primary" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
        {pending ? "Zapisuję…" : "Zapisz status"}
      </button>
    </form>
  );
}
