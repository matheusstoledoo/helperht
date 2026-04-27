// Lightweight event bus for health data freshness.
//
// Whenever the patient registers new data (workout, exam, meal log, vitals,
// diagnosis, treatment, goal, etc.) we bump a timestamp in localStorage.
// The Resumo de Saúde / Insights page compares this timestamp against the
// timestamp of the last generated analysis to decide whether to show a
// "novos dados — atualizar?" banner.

const LAST_DATA_UPDATE_KEY = "helperht_last_data_update";
const LAST_ANALYSIS_TS_KEY = "helperht_last_analysis_ts";
const LAST_ANALYSIS_DATA_KEY = "helperht_last_analysis_data";

export function markDataUpdated(): void {
  try {
    localStorage.setItem(LAST_DATA_UPDATE_KEY, Date.now().toString());
  } catch {
    /* localStorage unavailable — silently ignore */
  }
}

export function getLastDataUpdate(): number | null {
  try {
    const raw = localStorage.getItem(LAST_DATA_UPDATE_KEY);
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function markAnalysisGenerated(userId: string, data: unknown): void {
  try {
    const ts = Date.now();
    localStorage.setItem(`${LAST_ANALYSIS_TS_KEY}:${userId}`, ts.toString());
    localStorage.setItem(
      `${LAST_ANALYSIS_DATA_KEY}:${userId}`,
      JSON.stringify({ data, ts })
    );
  } catch {
    /* noop */
  }
}

export function getLastAnalysis<T = unknown>(
  userId: string
): { data: T; ts: number } | null {
  try {
    const raw = localStorage.getItem(`${LAST_ANALYSIS_DATA_KEY}:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.ts !== "number") return null;
    return parsed as { data: T; ts: number };
  } catch {
    return null;
  }
}

export function getLastAnalysisTimestamp(userId: string): number | null {
  try {
    const raw = localStorage.getItem(`${LAST_ANALYSIS_TS_KEY}:${userId}`);
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function hasNewerData(userId: string): boolean {
  const lastData = getLastDataUpdate();
  const lastAnalysis = getLastAnalysisTimestamp(userId);
  if (lastData === null) return false;
  if (lastAnalysis === null) return true;
  return lastData > lastAnalysis;
}

export function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr} h`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `há ${days} d`;
  const months = Math.floor(days / 30);
  return `há ${months} mês${months > 1 ? "es" : ""}`;
}
