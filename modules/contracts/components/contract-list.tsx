"use client";

import {
  CheckCircle2,
  CircleHelp,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  GripHorizontal,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";

import { useMovableDialog } from "@/modules/records/components/use-movable-dialog";

import { ContractAcceptForm } from "./contract-accept-form";
import { ContractVersionForm } from "./contract-version-form";
import { SignedContractForm } from "./signed-contract-form";
import { reviewSignedContractAction } from "../actions";

type ContractItem = {
  id: string;
  contractId: string;
  title: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "SIGNED_PENDING_REVIEW" | "ACCEPTED" | "EXPIRED";
  version: number;
  sha256: string;
  fileName: string;
  sizeLabel: string;
  parentName: string;
  parentId: string;
  studentName: string;
  sentAt: string;
  viewedAt: string | null;
  expiresAt: string | null;
  acceptedAt: string | null;
  signedUploadedAt: string | null;
  signedFile: { name: string; sizeBytes: number; sha256: string } | null;
  acceptanceMode: "DOCUMENTARY" | "EXTERNAL_SIGNATURE";
  serviceSummary: string;
  requiresPayment: boolean;
  paymentSummary: string | null;
  paymentAmountCents: number | null;
  paymentLabel: string | null;
  paymentDueDate: string | null;
  serviceStartDate: string | null;
  serviceEndDate: string | null;
  cancellationSummary: string | null;
  requiresEarlyStartRequest: boolean;
  installmentCount: number | null;
  installmentAmountCents: number | null;
  totalAmountCents: number | null;
  documents: { id: string; kind: "AGREEMENT_RODO" | "PRICE_LIST" | "SCHEDULE" | "OTHER"; title: string; fileName: string; sizeLabel: string }[];
  viewedDocumentIds: string[];
  acceptanceStatement: string;
  actionLabel: string;
};

const statusLabels = {
  DRAFT: "Szkic",
  SENT: "Wysłana",
  VIEWED: "Otwarta",
  SIGNED_PENDING_REVIEW: "Podpis do sprawdzenia",
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

function formatAmount(value: number | null): string {
  if (value === null) return "Kwota nie została ustrukturyzowana";
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(value / 100);
}

export function ContractList({
  items,
  isManagement,
  initialSelectedId,
}: {
  items: ContractItem[];
  isManagement: boolean;
  initialSelectedId?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const { startDrag, resetDialogPosition } = useMovableDialog(dialogRef);
  const [selected, setSelected] = useState<ContractItem | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [openedDocumentIds, setOpenedDocumentIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const item = initialSelectedId ? items.find((candidate) => candidate.id === initialSelectedId) : null;
    if (!item || dialogRef.current?.open) return;
    setSelected(item);
    setActiveDocumentId(item.documents[0]?.id ?? null);
    setOpenedDocumentIds(new Set(item.viewedDocumentIds));
    setDocumentLoaded(item.documents.length > 0 && item.viewedDocumentIds.length >= item.documents.length);
    dialogRef.current?.showModal();
  }, [initialSelectedId, items]);

  const groups = useMemo(() => {
    if (!isManagement) return [{ id: "mine", name: "", items }];
    const grouped = new Map<string, { id: string; name: string; items: ContractItem[] }>();
    for (const item of items) {
      const group = grouped.get(item.parentId) ?? {
        id: item.parentId,
        name: item.parentName,
        items: [],
      };
      group.items.push(item);
      grouped.set(item.parentId, group);
    }
    return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [isManagement, items]);

  function open(item: ContractItem, event: MouseEvent<HTMLButtonElement>) {
    lastTriggerRef.current = event.currentTarget;
    setSelected(item);
    setShowDocument(false);
    setDocumentLoaded(item.documents.length > 0 && item.viewedDocumentIds.length >= item.documents.length);
    setActiveDocumentId(item.documents[0]?.id ?? null);
    setOpenedDocumentIds(new Set(item.viewedDocumentIds));
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }

  function close() {
    dialogRef.current?.close();
    setShowDocument(false);
    setDocumentLoaded(false);
    setActiveDocumentId(null);
    setOpenedDocumentIds(new Set());
  }

  function restoreFocus() {
    resetDialogPosition();
    setShowDocument(false);
    setDocumentLoaded(false);
    setSelected(null);
    lastTriggerRef.current?.focus();
  }

  return (
    <>
      <div className="contract-parent-groups">
        {groups.map((group) => (
          <section className="contract-parent-group" key={group.id}>
            {isManagement ? (
              <header>
                <div className="contract-parent-avatar" aria-hidden="true">
                  {group.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <span className="section-kicker">Rodzic</span>
                  <h3>{group.name}</h3>
                </div>
                <strong>{group.items.length} {group.items.length === 1 ? "umowa" : "umów"}</strong>
              </header>
            ) : null}
            <div className="stage4-card-list">
              {group.items.map((item) => (
                <article className="contract-card" key={item.id}>
            <button
              type="button"
              className="contract-card-open"
              onClick={(event) => open(item, event)}
              aria-label={`Pokaż szczegóły umowy ${item.title}`}
            >
              <span className="stage4-icon"><FileCheck2 aria-hidden="true" /></span>
              <span className="contract-card-copy">
                <span className={`stage4-status status-${item.status.toLowerCase()}`}>
                  {item.status === "VIEWED" && item.acceptanceMode === "EXTERNAL_SIGNATURE" ? "Oczekuje na podpis" : statusLabels[item.status]}
                </span>
                <strong>{item.title}</strong>
                <span>
                  Wersja {item.version} · {item.studentName}
                </span>
                <small>Wybierz, aby zobaczyć pełne szczegóły i dokument</small>
              </span>
              <Eye aria-hidden="true" className="contract-card-eye" />
            </button>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className="stage4-preview-dialog"
        onClose={restoreFocus}
        aria-labelledby="contract-preview-title"
      >
        {selected ? (
          <div className="stage4-preview-shell">
            <header className="stage4-preview-header stage4-dialog-drag-handle" onPointerDown={startDrag}>
              <GripHorizontal className="stage4-dialog-grip" aria-label="Przeciągnij, aby przesunąć okno" />
              <div>
                <span className="section-kicker">Umowa · wersja {selected.version}</span>
                <h2 id="contract-preview-title">{selected.title}</h2>
                <p>{selected.studentName}{isManagement ? ` · ${selected.parentName}` : ""}</p>
              </div>
              <div className="stage4-preview-header-actions">
                <Link href="/panel/umowy/pomoc" title="Jak działają umowy online?">
                  <CircleHelp aria-hidden="true" /><span>Pomoc prawna</span>
                </Link>
                <button type="button" onClick={close} aria-label="Zamknij podgląd">
                  <X aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="stage4-preview-body">
              <section className="stage4-preview-summary" aria-label="Najważniejsze warunki">
                <div className="stage4-preview-status-row">
                  <span className={`stage4-status status-${selected.status.toLowerCase()}`}>
                    {selected.status === "VIEWED" && selected.acceptanceMode === "EXTERNAL_SIGNATURE" ? "Oczekuje na podpis" : statusLabels[selected.status]}
                  </span>
                  <span className="stage4-mode-chip">
                    <ShieldCheck aria-hidden="true" />
                    {selected.acceptanceMode === "DOCUMENTARY"
                      ? "Akceptacja w eDzienniku"
                      : "Wydruk, podpis i bezpieczny upload"}
                  </span>
                </div>
                <h3>Pakiet przekazany rodzicowi</h3>
                <p>{selected.documents.length ? "Umowa i informacje RODO, obowiązujący cennik lub kosztorys oraz harmonogram zajęć. Treść pozostaje w oryginalnych plikach szkoły." : selected.serviceSummary}</p>
                <h3>{selected.requiresPayment ? "Cena i płatność" : "Bez obowiązku zapłaty"}</h3>
                {selected.requiresPayment ? (
                  <div className="contract-payment-summary">
                    <strong>{selected.installmentCount ? `${selected.installmentCount} rat × ${formatAmount(selected.installmentAmountCents)}` : formatAmount(selected.paymentAmountCents)}</strong>
                    <span>{selected.totalAmountCents ? `Kwota całkowita: ${formatAmount(selected.totalAmountCents)}` : selected.paymentLabel ?? "Płatność wynikająca z umowy"}</span>
                    <small>Pierwszy termin: {formatDate(selected.paymentDueDate)}</small>
                    {selected.paymentSummary ? <p>{selected.paymentSummary}</p> : null}
                  </div>
                ) : <p>Ta umowa nie tworzy obowiązku zapłaty.</p>}
                <h3>Warunki umowy</h3>
                <p>Szczegółowy okres, zasady wypowiedzenia i terminy znajdują się w załączonej umowie oraz harmonogramie. System ich nie dubluje.</p>
                <div className="contract-consumer-summary">
                  <ShieldCheck aria-hidden="true" />
                  <div>
                    <strong>Umowa zawierana na odległość</strong>
                    <span>Co do zasady masz 14 dni na odstąpienie. Szczegóły i formularz znajdziesz w PDF oraz w pomocy prawnej.</span>
                  </div>
                </div>
                <dl className="stage4-preview-facts">
                  <div><dt>Wysłano</dt><dd>{formatDate(selected.sentAt, true)}</dd></div>
                  <div><dt>Otwarto</dt><dd>{formatDate(selected.viewedAt, true)}</dd></div>
                  <div><dt>Ważna do</dt><dd>{formatDate(selected.expiresAt)}</dd></div>
                  <div><dt>Plik</dt><dd>{selected.fileName} · {selected.sizeLabel}</dd></div>
                  <div className="stage4-preview-hash"><dt>Skrót SHA-256</dt><dd>{selected.sha256}</dd></div>
                </dl>
              </section>

              <section className="stage4-document-panel">
                {selected.documents.length ? <><div className="contract-document-tabs" role="tablist" aria-label="Dokumenty w pakiecie">{selected.documents.map((document) => <button key={document.id} type="button" role="tab" aria-selected={activeDocumentId === document.id} onClick={() => { setActiveDocumentId(document.id); setShowDocument(true); }}><FileText aria-hidden="true" /><span><strong>{document.title}</strong><small>{openedDocumentIds.has(document.id) ? "Sprawdzony" : `${document.fileName} · ${document.sizeLabel}`}</small></span></button>)}</div><p className="stage4-inline-info">Sprawdzone dokumenty: {openedDocumentIds.size} z {selected.documents.length}</p></> : null}
                {showDocument ? (
                  <iframe
                    title={`Dokument ${selected.title}`}
                    src={activeDocumentId ? `/panel/umowy/${selected.id}/dokument/${activeDocumentId}` : `/panel/umowy/${selected.id}/plik`}
                    onLoad={() => {
                      if (!activeDocumentId) { setDocumentLoaded(true); return; }
                      setOpenedDocumentIds((current) => {
                        const next = new Set(current); next.add(activeDocumentId);
                        setDocumentLoaded(next.size >= selected.documents.length);
                        return next;
                      });
                    }}
                  />
                ) : (
                  <div className="stage4-document-placeholder">
                    <FileText aria-hidden="true" />
                    <h3>{selected.documents.length ? "Wybierz jeden z trzech dokumentów" : "Dokument nie otworzy się sam"}</h3>
                    <p>Rodzic może osobno sprawdzić umowę, cennik i harmonogram.</p>
                    <button className="stage4-primary" type="button" onClick={() => setShowDocument(true)}>
                      <Eye aria-hidden="true" /> {selected.documents.length ? "Otwórz pierwszy dokument" : "Wyświetl PDF"}
                    </button>
                  </div>
                )}
              </section>
            </div>

            <footer className="stage4-preview-footer">
              <a
                className="stage4-secondary"
                href={activeDocumentId ? `/panel/umowy/${selected.id}/dokument/${activeDocumentId}?download=1` : `/panel/umowy/${selected.id}/plik?download=1`}
                target="_blank"
                rel="noreferrer"
              >
                <Download aria-hidden="true" /> Pobierz wybrany PDF
              </a>

              {!isManagement && selected.acceptanceMode === "DOCUMENTARY" && selected.status !== "ACCEPTED" && selected.status !== "EXPIRED" && documentLoaded ? (
                <ContractAcceptForm
                  assignmentId={selected.id}
                  statement={selected.acceptanceStatement}
                  actionLabel={selected.actionLabel}
                  requiresPayment={selected.requiresPayment}
                  requiresEarlyStartRequest={selected.requiresEarlyStartRequest}
                />
              ) : !isManagement && selected.acceptanceMode === "DOCUMENTARY" && selected.status !== "ACCEPTED" && selected.status !== "EXPIRED" ? (
                <p className="stage4-external-note">Najpierw wyświetl dokument PDF. Pole akceptacji pojawi się po jego załadowaniu.</p>
              ) : selected.status === "ACCEPTED" ? (
                <div className="stage4-acceptance-receipt">
                  <span><CheckCircle2 aria-hidden="true" /> Zapisano {formatDate(selected.acceptedAt, true)}</span>
                  {selected.acceptanceMode === "EXTERNAL_SIGNATURE" && selected.signedFile ? (
                    <a className="stage4-secondary" href={`/panel/umowy/${selected.id}/podpisany`}>
                      <Download aria-hidden="true" /> Pobierz podpisany dokument
                    </a>
                  ) : null}
                  <a className="stage4-secondary" href={`/panel/umowy/${selected.id}/potwierdzenie`}>
                    <Download aria-hidden="true" /> Pobierz potwierdzenie
                  </a>
                </div>
              ) : selected.status === "EXPIRED" ? (
                <span className="contract-expired-note"><Clock3 aria-hidden="true" /> Poproś szkołę o nową wersję</span>
              ) : selected.acceptanceMode === "EXTERNAL_SIGNATURE" && selected.status === "SIGNED_PENDING_REVIEW" ? (
                isManagement ? <div className="signed-review-actions"><a className="stage4-secondary" href={`/panel/umowy/${selected.id}/podpisany`}><Download /> Pobierz podpisany plik</a><form action={reviewSignedContractAction}><input type="hidden" name="assignmentId" value={selected.id} /><button className="stage4-primary" name="decision" value="approve">Zatwierdź podpis</button><button className="stage4-secondary" name="decision" value="reject">Poproś o ponowne wgranie</button></form></div> : <p className="stage4-external-note"><UploadCloud aria-hidden="true" /> Podpisany dokument czeka na sprawdzenie przez dyrektora.</p>
              ) : selected.acceptanceMode === "EXTERNAL_SIGNATURE" ? (
                !isManagement && documentLoaded ? <SignedContractForm assignmentId={selected.id} /> : <p className="stage4-external-note">Pobierz PDF, wydrukuj i podpisz cały dokument. Po wyświetleniu PDF pojawi się bezpieczne pole wgrania.</p>
              ) : null}

              {isManagement && selected.documents.length === 0 ? (
                <ContractVersionForm
                  contractId={selected.contractId}
                  assignmentId={selected.id}
                  initial={{
                    title: selected.title,
                    acceptanceMode: selected.acceptanceMode,
                    serviceSummary: selected.serviceSummary,
                    requiresPayment: selected.requiresPayment,
                    paymentSummary: selected.paymentSummary,
                    paymentAmountCents: selected.paymentAmountCents,
                    paymentLabel: selected.paymentLabel,
                    paymentDueDate: selected.paymentDueDate,
                    serviceStartDate: selected.serviceStartDate,
                    serviceEndDate: selected.serviceEndDate,
                    cancellationSummary: selected.cancellationSummary,
                    requiresEarlyStartRequest: selected.requiresEarlyStartRequest,
                  }}
                />
              ) : null}
            </footer>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
