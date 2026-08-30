type BenchmarkRow = {
  requestsPerSecond?: number;
  p95Ms?: number | null;
  unexpectedErrors?: number;
  throttled?: number;
};

export type BenchmarkSummary = {
  status: "ok" | "stopped";
  peakRequestsPerSecond: number;
  worstP95Ms: number;
  unexpectedErrors: number;
  throttledResponses: number;
};

export function summarizeBenchmark(raw: string): BenchmarkSummary {
  const parsed = JSON.parse(raw) as { status?: unknown; results?: unknown };
  if (parsed.status !== "ok" && parsed.status !== "stopped") throw new Error("Serwer zwrócił nieprawidłowy wynik pomiaru.");
  const rows = Array.isArray(parsed.results) ? parsed.results as BenchmarkRow[] : [];
  const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
  return {
    status: parsed.status,
    peakRequestsPerSecond: Math.max(0, ...rows.map((row) => finite(row.requestsPerSecond))),
    worstP95Ms: Math.max(0, ...rows.map((row) => finite(row.p95Ms))),
    unexpectedErrors: rows.reduce((sum, row) => sum + finite(row.unexpectedErrors), 0),
    throttledResponses: rows.reduce((sum, row) => sum + finite(row.throttled), 0),
  };
}
