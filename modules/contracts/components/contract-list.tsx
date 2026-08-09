"use client";

import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  ShieldCheck,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

import { ContractAcceptForm } from "./contract-accept-form";
import { ContractVersionForm } from "./contract-version-form";

type ContractItem = {
  id: string;
  contractId: string;
  title: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "EXPIRED";
  version: number;
  sha256: string;
  fileName: string;
  sizeLabel: string;
  parentName: string;
  studentName: string;
  sentAt: string;
  viewedAt: string | null;
  expiresAt: string | null;
  acceptedAt: string | null;
  acceptanceMode: "DOCUMENTARY" | "EXTERNAL_SIGNATURE";
  serviceSummary: string;
  requiresPayment: boolean;
  paymentSummary: string | null;
  acceptanceStatement: string;
  actionLabel: string;
};

const statusLabels = {
  DRAFT: "Szkic",
  SENT: "Wysłana",
  VIEWED: "Otwarta",
  ACCEPTED: "Zaakceptowana",
  EXPIRED: "Wygasła",
} as const;

function formatDate(value: string | null, includeTime = false): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" } : {}),
  }).format(new Date(value));
}

export function ContractList({
  items,
  isManagement,
}: {
  items: ContractItem[];
  isManagement: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<ContractItem | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  const [documentLoaded, setDocumentLoaded] = useState(false);

  function open(item: ContractItem) {
    setSelected(item);
    setShowDocument(false);
    setDocumentLoaded(false);
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }

  function close() {
    dialogRef.current?.close();
    setShowDocument(false);
    setDocumentLoaded(false);
  }

  return (
    <>
      <div className="stage4-card-list">
        {items.map((item) => (
          <article className="contract-card" key={item.id}>
            <button
              type="button"
              className="contract-card-open"
              onClick={() => open(item)}
              aria-label={`Pokaż szczegóły umowy ${item.title}`}
            >
              <span className="stage4-icon"><FileCheck2 aria-hidden="true" /></span>
              <span className="contract-card-copy">
                <span className={`stage4-status status-${item.status.toLowerCase()}`}>
                  {statusLabels[item.status]}
                </span>
                <strong>{item.title}</strong>
                <span>
                  Wersja {item.version} · {item.studentName}
                  {isManagement ? ` · rodzic: ${item.parentName}` : ""}
                </span>
                <small>Wybierz, aby zobaczyć pełne szczegóły i dokument</small>
              </span>
              <Eye aria-hidden="true" className="contract-card-eye" />
            </button>
          </article>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className="stage4-preview-dialog"
        onClose={() => setShowDocument(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        aria-labelledby="contract-preview-title"
      >
        {selected ? (
          <div className="stage4-preview-shell">
            <header className="stage4-preview-header">
              <div>
                <span className="section-kicker">Umowa · wersja {selected.version}</span>
                <h2 id="contract-preview-title">{selected.title}</h2>
                <p>{selected.studentName}{isManagement ? ` · ${selected.parentName}` : ""}</p>
              </div>
              <button type="button" onClick={close} aria-label="Zamknij podgląd">
                <X aria-hidden="true" />
              </button>
            </header>

            <div className="stage4-preview-body">
              <section className="stage4-preview-summary" aria-label="Najważniejsze warunki">
                <div className="stage4-preview-status-row">
                  <span className={`stage4-status status-${selected.status.toLowerCase()}`}>
                    {statusLabels[selected.status]}
                  </span>
                  <span className="stage4-mode-chip">
                    <ShieldCheck aria-hidden="true" />
                    {selected.acceptanceMode === "DOCUMENTARY"
                      ? "Akceptacja w eDzienniku"
                      : "Podpis poza systemem"}
                  </span>
                </div>
                <h3>Co obejmuje umowa</h3>
                <p>{selected.serviceSummary}</p>
                <h3>{selected.requiresPayment ? "Cena i płatność" : "Bez obowiązku zapłaty"}</h3>
                <p>
                  {selected.requiresPayment
                    ? selected.paymentSummary
                    : "Ta umowa nie tworzy obowiązku zapłaty."}
                </p>
                <dl className="stage4-preview-facts">
                  <div><dt>Wysłano</dt><dd>{formatDate(selected.sentAt, true)}</dd></div>
                  <div><dt>Otwarto</dt><dd>{formatDate(selected.viewedAt, true)}</dd></div>
                  <div><dt>Ważna do</dt><dd>{formatDate(selected.expiresAt)}</dd></div>
                  <div><dt>Plik</dt><dd>{selected.fileName} · {selected.sizeLabel}</dd></div>
                  <div className="stage4-preview-hash"><dt>Skrót SHA-256</dt><dd>{selected.sha256}</dd></div>
                </dl>
              </section>

              <section className="stage4-document-panel">
                {showDocument ? (
                  <iframe
                    title={`Dokument ${selected.title}`}
                    src={`/panel/umowy/${selected.id}/plik`}
                    onLoad={() => setDocumentLoaded(true)}
                  />
                ) : (
                  <div className="stage4-document-placeholder">
                    <FileText aria-hidden="true" />
                    <h3>Dokument nie otworzy się sam</h3>
                    <p>Wybierz przycisk, aby świadomie wyświetlić dokładną wersję PDF.</p>
                    <button className="stage4-primary" type="button" onClick={() => setShowDocument(true)}>
                      <Eye aria-hidden="true" /> Wyświetl PDF
                    </button>
                  </div>
                )}
              </section>
            </div>

            <footer className="stage4-preview-footer">
              <a
                className="stage4-secondary"
                href={`/panel/umowy/${selected.id}/plik?download=1`}
                target="_blank"
                rel="noreferrer"
              >
                <Download aria-hidden="true" /> Pobierz PDF
              </a>

              {!isManagement && selected.acceptanceMode === "DOCUMENTARY" && selected.status !== "ACCEPTED" && selected.status !== "EXPIRED" && documentLoaded ? (
                <ContractAcceptForm
                  assignmentId={selected.id}
                  statement={selected.acceptanceStatement}
                  actionLabel={selected.actionLabel}
                />
              ) : !isManagement && selected.acceptanceMode === "DOCUMENTARY" && selected.status !== "ACCEPTED" && selected.status !== "EXPIRED" ? (
                <p className="stage4-external-note">Najpierw wyświetl dokument PDF. Pole akceptacji pojawi się po jego załadowaniu.</p>
              ) : selected.status === "ACCEPTED" ? (
                <div className="stage4-acceptance-receipt">
                  <span><CheckCircle2 aria-hidden="true" /> Zapisano {formatDate(selected.acceptedAt, true)}</span>
                  <a className="stage4-secondary" href={`/panel/umowy/${selected.id}/potwierdzenie`}>
                    <Download aria-hidden="true" /> Pobierz potwierdzenie
                  </a>
                </div>
              ) : selected.status === "EXPIRED" ? (
                <span className="contract-expired-note"><Clock3 aria-hidden="true" /> Poproś szkołę o nową wersję</span>
              ) : selected.acceptanceMode === "EXTERNAL_SIGNATURE" ? (
                <p className="stage4-external-note">Zapoznaj się z dokumentem. Szkoła przekaże osobno sposób podpisu.</p>
              ) : null}

              {isManagement ? (
                <ContractVersionForm contractId={selected.contractId} assignmentId={selected.id} />
              ) : null}
            </footer>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
