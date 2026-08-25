export const progressSkills = ["speaking", "listening", "reading", "writing", "vocabulary", "grammar"] as const;
export type ProgressSkill = (typeof progressSkills)[number];
export type ProgressPoint = Record<ProgressSkill, number> & { observedAt: Date };

export function buildDescriptiveProgressSummary(points: readonly ProgressPoint[]) {
  if (points.length === 0) return { kind: "insufficient" as const, message: "Brak obserwacji do podsumowania.", latest: null, changes: null };
  const ordered = [...points].sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime());
  const latest = ordered.at(-1)!;
  if (ordered.length < 2) return { kind: "insufficient" as const, message: "Potrzebne są co najmniej dwie obserwacje, aby pokazać zmianę.", latest, changes: null };
  const first = ordered[0]!;
  const changes = Object.fromEntries(progressSkills.map((skill) => [skill, latest[skill] - first[skill]])) as Record<ProgressSkill, number>;
  return { kind: "descriptive" as const, message: "Zmiana opisuje wyłącznie zapisane obserwacje. Nie jest diagnozą ani prognozą zachowania ucznia.", latest, changes };
}
