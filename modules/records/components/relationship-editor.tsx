"use client";

import { Check, Search, UsersRound } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { updateRelationshipAction } from "@/modules/records/relationship-actions";
import type { RelationshipKind } from "@/modules/records/relationship-schema";
import { initialRecordUpdateState } from "@/modules/records/state";

export type RelationshipOption = {
  id: string;
  name: string;
  meta?: string;
};

export function RelationshipEditor({
  entityId,
  relationKind,
  title,
  description,
  options,
  selectedIds,
  actorRole,
  single = false,
}: {
  entityId: string;
  relationKind: RelationshipKind;
  title: string;
  description: string;
  options: RelationshipOption[];
  selectedIds: string[];
  actorRole: "DIRECTOR" | "TEACHER";
  single?: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateRelationshipAction,
    initialRecordUpdateState,
  );
  const [query, setQuery] = useState("");
  const ordered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pl-PL");
    return [...options].sort((left, right) => {
      const selectedOrder = Number(selectedIds.includes(right.id)) - Number(selectedIds.includes(left.id));
      const visibleOrder = Number(
        `${right.name} ${right.meta ?? ""}`.toLocaleLowerCase("pl-PL").includes(needle),
      ) - Number(
        `${left.name} ${left.meta ?? ""}`.toLocaleLowerCase("pl-PL").includes(needle),
      );
      return visibleOrder || selectedOrder || left.name.localeCompare(right.name, "pl");
    }).map((option, index) => ({
      ...option,
      visible: needle
        ? `${option.name} ${option.meta ?? ""}`.toLocaleLowerCase("pl-PL").includes(needle)
        : selectedIds.includes(option.id) || index < 5,
    }));
  }, [options, query, selectedIds]);

  return (
    <div className="relationship-editor">
      <div className="relationship-editor-heading">
        <span><UsersRound aria-hidden="true" /></span>
        <div>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>
      </div>
      <form action={action}>
        <input type="hidden" name="entityId" value={entityId} />
        <input type="hidden" name="relationKind" value={relationKind} />
        {options.length > 6 ? (
          <label className="relationship-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Szukaj na liście</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Szukaj po nazwie"
            />
          </label>
        ) : null}
        {options.length > 5 && !query.trim() ? <p className="relationship-hint">Pokazujemy 5 propozycji i obecne przypisania. Pozostałe znajdziesz przez wyszukiwarkę.</p> : null}
        <div className="relationship-options" role={single ? "radiogroup" : "group"}>
          {ordered.every((option) => !option.visible) ? (
            <p className="relationship-empty">Brak pasujących aktywnych kartotek.</p>
          ) : null}
          {ordered.map((option) => (
              <label key={`${option.id}:${selectedIds.includes(option.id)}`} className="relationship-option" hidden={!option.visible}>
                <input
                  type={single ? "radio" : "checkbox"}
                  name="selectedId"
                  value={option.id}
                  defaultChecked={selectedIds.includes(option.id)}
                />
                <span className="relationship-check"><Check aria-hidden="true" /></span>
                <span>
                  <strong>{option.name}</strong>
                  {option.meta ? <small>{option.meta}</small> : null}
                </span>
              </label>
            ))}
          {single ? (
            <label className="relationship-option relationship-option-none">
              <input
                type="radio"
                name="selectedId"
                value=""
                defaultChecked={selectedIds.length === 0}
              />
              <span className="relationship-check"><Check aria-hidden="true" /></span>
              <span><strong>Bez preferowanej sali</strong><small>Generator wybierze wolną salę</small></span>
            </label>
          ) : null}
        </div>
        {state.message ? (
          <p className={`record-form-message is-${state.status}`} role="status">
            {state.message}
          </p>
        ) : null}
        <button className="button button-secondary relationship-save" type="submit" disabled={pending}>
          {pending
            ? "Zapisywanie…"
            : actorRole === "DIRECTOR"
              ? "Zapisz przypisania"
              : "Wyślij zmianę do dyrektora"}
        </button>
      </form>
    </div>
  );
}
