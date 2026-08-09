"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  HelpCircle,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { useActionState } from "react";

import {
  commitImportAction,
  previewImportAction,
} from "@/modules/imports/actions";
import { initialImportActionState } from "@/modules/imports/state";

const entityLabels = {
  ROOM: "Sala",
  TEACHER: "Wykładowca",
  GROUP: "Grupa",
  STUDENT: "Uczeń",
  PARENT: "Rodzic",
  RELATION: "Relacja",
} as const;

export function ImportWizard() {
  const [previewState, previewAction, previewPending] = useActionState(
    previewImportAction,
    initialImportActionState,
  );
  const [commitState, commitAction, commitPending] = useActionState(
    commitImportAction,
    initialImportActionState,
  );
  const preview = previewState.preview;

  return (
    <section className="records-card import-card" id="import">
      <div className="records-card-heading">
        <span className="record-icon record-icon-blue">
          <FileSpreadsheet aria-hidden="true" />
        </span>
        <div>
          <span className="section-kicker">Najwygodniej przy większej liście</span>
          <h2>Import CSV lub XLSX</h2>
          <p>
            Najpierw zobaczysz podgląd i błędy. Nic nie zapisze się bez osobnego
            potwierdzenia.
          </p>
        </div>
        <details className="import-help">
          <summary aria-label="Pokaż instrukcję przygotowania pliku CSV">
            <HelpCircle aria-hidden="true" /> Jak przygotować plik?
          </summary>
          <div>
            <h3>CSV krok po kroku</h3>
            <ol>
              <li>Pobierz szablon i otwórz go w Excelu, Numbers albo Arkuszach Google.</li>
              <li>Nie zmieniaj nazw kolumn. Każdy rekord wpisz w osobnym wierszu.</li>
              <li>W kolumnie „typ” użyj: sala, wykladowca, grupa, uczen, rodzic albo relacja.</li>
              <li>W Excelu wybierz „Zapisz jako” → „CSV UTF-8 (rozdzielany przecinkami)”. System rozpozna też średnik.</li>
              <li>Wczytaj plik i sprawdź podgląd. Zapis nastąpi dopiero po potwierdzeniu.</li>
            </ol>
            <p><strong>Obecny tryb:</strong> uzupełnia i aktualizuje istniejące kartoteki. Niczego nie usuwa. Bezpieczna synchronizacja z archiwizacją brakujących rekordów powstanie jako osobny, dodatkowo potwierdzany tryb.</p>
          </div>
        </details>
      </div>

      <ol className="import-steps" aria-label="Etapy importu">
        <li className="active">
          <span>1</span> Wybierz plik
        </li>
        <li className={preview ? "active" : undefined}>
          <span>2</span> Sprawdź podgląd
        </li>
        <li className={commitState.status === "success" ? "active" : undefined}>
          <span>3</span> Zapisz dane
        </li>
      </ol>

      <form action={previewAction} className="import-upload-form">
        <label className="file-drop">
          <Upload aria-hidden="true" />
          <span>
            <strong>Wybierz plik z komputera</strong>
            <small>CSV lub XLSX, maksymalnie 5 MB i 1000 wierszy</small>
          </span>
          <input
            type="file"
            name="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
          />
        </label>
        <div className="import-actions">
          <a className="button button-secondary" href="/szablon-importu-kla.csv">
            Pobierz szablon CSV
          </a>
          <button
            className="button button-primary"
            type="submit"
            disabled={previewPending}
          >
            {previewPending ? (
              <>
                <LoaderCircle className="spin" aria-hidden="true" />
                Sprawdzam plik…
              </>
            ) : (
              "Pokaż podgląd"
            )}
          </button>
        </div>
      </form>

      {previewState.message ? (
        <p
          className={`form-status ${previewState.status === "error" ? "error" : "success"}`}
          role="status"
        >
          {previewState.status === "error" || (preview?.errorRows ?? 0) > 0 ? (
            <AlertCircle aria-hidden="true" />
          ) : (
            <CheckCircle2 aria-hidden="true" />
          )}
          {previewState.message}
        </p>
      ) : null}

      {preview ? (
        <div className="import-preview">
          <div className="import-summary" aria-label="Podsumowanie importu">
            <span>
              <strong>{preview.totalRows}</strong>
              wierszy
            </span>
            <span className="summary-success">
              <strong>{preview.validRows}</strong>
              poprawnych
            </span>
            <span className={preview.errorRows > 0 ? "summary-error" : undefined}>
              <strong>{preview.errorRows}</strong>
              z błędem
            </span>
            <span>
              <strong>{preview.duplicateRows}</strong>
              duplikatów
            </span>
          </div>

          {preview.issues.length > 0 ? (
            <div className="import-errors">
              <h3>Co trzeba poprawić</h3>
              <ul>
                {preview.issues.slice(0, 20).map((issue, index) => (
                  <li key={`${issue.rowNumber}-${issue.code}-${index}`}>
                    <strong>Wiersz {issue.rowNumber}</strong>
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
              {preview.issues.length > 20 ? (
                <p>
                  Pokazujemy pierwsze 20 błędów z {preview.issues.length}.
                  Popraw je i wczytaj plik ponownie.
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="import-table-wrap">
                <table className="records-table import-table">
                  <thead>
                    <tr>
                      <th>Wiersz</th>
                      <th>Typ</th>
                      <th>Pozycja</th>
                      <th>Powiązanie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 10).map((row) => (
                      <tr key={row.rowNumber}>
                        <td>{row.rowNumber}</td>
                        <td>{entityLabels[row.entity]}</td>
                        <td>
                          {row.name ??
                            [row.firstName, row.lastName]
                              .filter(Boolean)
                              .join(" ") ??
                            "—"}
                        </td>
                        <td>
                          {row.groupName ??
                            row.childExternalId ??
                            row.externalId ??
                            "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.rows.length > 10 ? (
                <p className="table-note">
                  Pokazujemy 10 z {preview.rows.length} poprawnych wierszy.
                </p>
              ) : null}

              <form action={commitAction} className="import-confirm">
                <input
                  type="hidden"
                  name="batchId"
                  value={previewState.batchId}
                />
                <span>
                  <strong>Gotowe do zapisu</strong>
                  <small>
                    Import jest jedną transakcją: zapisze się wszystko albo nic.
                  </small>
                </span>
                <button
                  className="button button-red"
                  type="submit"
                  disabled={commitPending}
                >
                  {commitPending ? (
                    <>
                      <LoaderCircle className="spin" aria-hidden="true" />
                      Zapisuję…
                    </>
                  ) : (
                    `Zapisz ${preview.totalRows} wierszy`
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      ) : null}

      {commitState.message ? (
        <p
          className={`form-status ${commitState.status === "success" ? "success" : "error"}`}
          role="status"
        >
          {commitState.status === "success" ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <AlertCircle aria-hidden="true" />
          )}
          {commitState.message}
        </p>
      ) : null}
    </section>
  );
}
