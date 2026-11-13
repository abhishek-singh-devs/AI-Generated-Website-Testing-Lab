import type { RunStatus, TestProfile, TestRunRow } from "@/lib/testing/types";

export const HISTORY_STATUSES = ["all", "passed", "warning", "failed"] as const;
export const HISTORY_RANGES = { all: "All time", "24h": "Last 24 hours", "7d": "Last 7 days", "30d": "Last 30 days" } as const;
export const HISTORY_SOURCES = { all: "All runs", mine: "My runs", sample: "Sample runs" } as const;

export type HistoryFilters = {
  q?: string | undefined;
  status?: (typeof HISTORY_STATUSES)[number] | undefined;
  profile?: TestProfile | "all" | undefined;
  range?: keyof typeof HISTORY_RANGES | undefined;
  source?: keyof typeof HISTORY_SOURCES | undefined;
  page?: number | undefined;
};

const DAY = 864e5;

/** Filter runs by text (URL, instructions, summary), status, profile, date range and source. */
export function filterRuns(runs: TestRunRow[], f: HistoryFilters, now = Date.now()): TestRunRow[] {
  const q = f.q?.trim().toLowerCase();
  const cutoff = f.range === "24h" ? now - DAY : f.range === "7d" ? now - 7 * DAY : f.range === "30d" ? now - 30 * DAY : null;
  return runs.filter((r) => {
    if (q && !(r.url.toLowerCase().includes(q) || (r.instructions ?? "").toLowerCase().includes(q) || (r.summary ?? "").toLowerCase().includes(q))) return false;
    if (f.status && f.status !== "all" && r.status !== (f.status as RunStatus)) return false;
    if (f.profile && f.profile !== "all" && r.profile !== f.profile) return false;
    if (cutoff && new Date(r.created_at).getTime() < cutoff) return false;
    if (f.source === "mine" && r.is_sample) return false;
    if (f.source === "sample" && !r.is_sample) return false;
    return true;
  });
}