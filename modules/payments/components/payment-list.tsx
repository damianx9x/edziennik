"use client";

import { CalendarClock, CheckCircle2, CircleAlert, Eye, ShieldCheck, X } from "lucide-react";
import { useRef, useState } from "react";

import { paymentStatusLabels } from "../schema";

type PaymentItem = {
  id: string;
  studentName: string;
  period: string;
  status: "UNSET" | "PENDING" | "PAID" | "OVERDUE";
  dueDate: string | null;
  updatedAt: string;
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

function StatusIcon({ status }: { status: PaymentItem["status"] }) {
  if (status === "PAID") return <CheckCircle2 aria-hidden="true" />;
  if (status === "OVERDUE") return <CircleAlert aria-hidden="true" />;
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
  const [selected, setSelected] = useState<PaymentItem | null>(null);

  function open(item: PaymentItem) {
    setSelected(item);
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <div className="payment-list">
        {items.map((item) => (
          <article key={item.id}>
            <button type="button" className="payment-row-open" onClick={() => open(item)}>
              <span className={`payment-status payment-${item.status.toLowerCase()}`}>
                <StatusIcon status={item.status} />
                {paymentStatusLabels[item.status]}
              </span>
              <span className="payment-row-copy">
                <strong>{item.studentName}</strong>
                <span>{item.period}{item.dueDate ? ` · termin ${formatDate(item.dueDate)}` : ""}</span>
              </span>
              {isManagement ? <small>Zmienił/a: {item.changedByName} · {formatDate(item.updatedAt, true)}</small> : null}
              <Eye aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className="stage4-preview-dialog payment-preview-dialog"
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        aria-labelledby="payment-preview-title"
      >
        {selected ? (
          <div className="stage4-preview-shell">
            <header className="stage4-preview-header">
              <div>
                <span className="section-kicker">Status płatności</span>
                <h2 id="payment-preview-title">{selected.period}</h2>
                <p>{selected.studentName}</p>
              </div>
              <button type="button" onClick={close} aria-label="Zamknij szczegóły">
                <X aria-hidden="true" />
              </button>
            </header>
            <div className="payment-preview-body">
              <span className={`payment-status payment-${selected.status.toLowerCase()}`}>
                <StatusIcon status={selected.status} />
                {paymentStatusLabels[selected.status]}
              </span>
              <dl className="stage4-preview-facts">
                <div><dt>Okres</dt><dd>{selected.period}</dd></div>
                <div><dt>Termin</dt><dd>{formatDate(selected.dueDate)}</dd></div>
                <div><dt>Ostatnia zmiana</dt><dd>{formatDate(selected.updatedAt, true)}</dd></div>
                {isManagement ? <div><dt>Zmienił/a</dt><dd>{selected.changedByName}</dd></div> : null}
              </dl>
              {isManagement && selected.note ? (
                <section className="payment-private-note">
                  <h3>Notatka administracyjna</h3>
                  <p>{selected.note}</p>
                </section>
              ) : null}
              <p className="stage4-privacy-note">
                <ShieldCheck aria-hidden="true" /> To ręczny status informacyjny. System nie przechowuje danych karty ani rachunku bankowego.
              </p>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
