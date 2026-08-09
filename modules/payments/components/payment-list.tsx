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
  assignmentId: string;
  parentId: string;
  parentName: string;
  studentName: string;
  contractTitle: string;
  contractVersion: number;
  contractStatus: "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "EXPIRED";
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
}: {
  items: PaymentItem[];
  isManagement: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const { startDrag, resetDialogPosition } = useMovableDialog(dialogRef);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const selected = useMemo(
    () => items.find((item) => item.assignmentId === selectedAssignmentId) ?? null,
    [items, selectedAssignmentId],
  );
  const [filter, setFilter] = useState<PaymentFilter>("ALL");
  const visibleItems = useMemo(() => items.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "PAID") return item.displayStatus === "PAID";
    if (filter === "ACTION") return ["UNSET", "PENDING", "OVERDUE"].includes(item.displayStatus);
    return ["WAITING_SIGNATURE", "CONTRACT_EXPIRED"].includes(item.displayStatus);
  }), [filter, items]);
  const groups = useMemo(() => {
    if (!isManagement) return [{ id: "mine", name: "", items: visibleItems }];
    const grouped = new Map<string, { id: string; name: string; items: PaymentItem[] }>();
    for (const item of visibleItems) {
      const group = grouped.get(item.parentId) ?? {
        id: item.parentId,
        name: item.parentName,
        items: [],
      };
      group.items.push(item);
      grouped.set(item.parentId, group);
    }
    return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [isManagement, visibleItems]);

  const counts = useMemo(() => ({
    ALL: items.length,
    ACTION: items.filter((item) => ["UNSET", "PENDING", "OVERDUE"].includes(item.displayStatus)).length,
    PAID: items.filter((item) => item.displayStatus === "PAID").length,
    WAITING: items.filter((item) => ["WAITING_SIGNATURE", "CONTRACT_EXPIRED"].includes(item.displayStatus)).length,
  }), [items]);

  function open(item: PaymentItem, event: MouseEvent<HTMLButtonElement>) {
    lastTriggerRef.current = event.currentTarget;
    setSelectedAssignmentId(item.assignmentId);
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
              {group.items.map((item) => (
                <article key={item.assignmentId}>
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
                      <span>{item.studentName} · {item.paymentLabel}</span>
                      <small>{formatAmount(item.paymentAmountCents)} · termin {formatDate(item.dueDate)}</small>
                    </span>
                    <Eye aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
          </section>
        ))}
        {visibleItems.length === 0 ? (
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
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        aria-labelledby="payment-preview-title"
      >
        {selected ? (
          <div className="stage4-preview-shell">
            <header className="stage4-preview-header stage4-dialog-drag-handle" onPointerDown={startDrag}>
              <GripHorizontal className="stage4-dialog-grip" aria-label="Przeciągnij, aby przesunąć okno" />
              <div>
                <span className="section-kicker">Płatność z umowy · wersja {selected.contractVersion}</span>
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
              <dl className="stage4-preview-facts">
                <div><dt>Kwota z umowy</dt><dd>{formatAmount(selected.paymentAmountCents)}</dd></div>
                <div><dt>Termin z umowy</dt><dd>{formatDate(selected.dueDate)}</dd></div>
                <div><dt>Opis</dt><dd>{selected.paymentLabel}</dd></div>
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
