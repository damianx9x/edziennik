"use client";

import { ArrowUpRight, GripHorizontal, X } from "lucide-react";
import { useRef, useState } from "react";

import { useMovableDialog } from "@/modules/records/components/use-movable-dialog";

export type PageStatisticDetail = {
  path: string;
  label: string;
  visits: number;
  authenticated: number;
  anonymous: number;
  firstVisit: string | null;
  lastVisit: string | null;
  roles: Array<{ label: string; value: number }>;
  hours: Array<{ label: string; value: number }>;
};

export function PageStatisticsList({
  pages,
}: {
  pages: PageStatisticDetail[];
}) {
  const [selected, setSelected] = useState<PageStatisticDetail | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { startDrag, resetDialogPosition } = useMovableDialog(dialogRef);
  const max = Math.max(1, ...pages.map((item) => item.visits));

  return (
    <>
      <div className="statistics-bars">
        {pages.map((item) => (
          <button
            type="button"
            key={item.path}
            onClick={() => {
              setSelected(item);
              requestAnimationFrame(() => dialogRef.current?.showModal());
            }}
          >
            <span>
              <strong>{item.label}</strong>
              <small>{item.visits} odsłon · pokaż szczegóły</small>
            </span>
            <i style={{ width: `${(item.visits / max) * 100}%` }} />
            <ArrowUpRight aria-hidden="true" />
          </button>
        ))}
      </div>
      <dialog
        ref={dialogRef}
        className="statistics-detail-dialog"
        onClose={() => {
          resetDialogPosition();
          setSelected(null);
        }}
        aria-labelledby="statistics-detail-title"
      >
        {selected ? (
          <div>
            <header className="stage4-dialog-drag-handle" onPointerDown={startDrag}>
              <GripHorizontal className="stage4-dialog-grip" aria-label="Przeciągnij, aby przesunąć okno" />
              <div>
                <span className="section-kicker">Szczegóły ostatnich 30 dni</span>
                <h2 id="statistics-detail-title">{selected.label}</h2>
                <p>{selected.path}</p>
              </div>
              <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Zamknij szczegóły">
                <X aria-hidden="true" />
              </button>
            </header>
            <section className="statistics-detail-metrics" aria-label="Podsumowanie strony">
              <article><strong>{selected.visits}</strong><small>wszystkich odsłon</small></article>
              <article><strong>{selected.authenticated}</strong><small>po zalogowaniu</small></article>
              <article><strong>{selected.anonymous}</strong><small>anonimowych</small></article>
            </section>
            <dl>
              <div><dt>Pierwsza odsłona</dt><dd>{selected.firstVisit ?? "Brak"}</dd></div>
              <div><dt>Ostatnia odsłona</dt><dd>{selected.lastVisit ?? "Brak"}</dd></div>
            </dl>
            <div className="statistics-detail-grid">
              <section><h3>Role</h3><DetailList items={selected.roles} /></section>
              <section><h3>Najczęstsze godziny</h3><DetailList items={selected.hours} /></section>
            </div>
            <p className="statistics-privacy-note">Dla ochrony prywatności system nie zapisuje pełnego IP, dokładnej lokalizacji ani surowych danych urządzenia.</p>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

function DetailList({ items }: { items: Array<{ label: string; value: number }> }) {
  if (items.length === 0) return <p>Brak danych w tym okresie.</p>;
  return <ul>{items.map((item) => <li key={item.label}><span>{item.label}</span><strong>{item.value}</strong></li>)}</ul>;
}
