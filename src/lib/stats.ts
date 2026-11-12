import { format, startOfDay, subDays } from "date-fns";
import { CATEGORY_LABELS } from "@/lib/testing/constants";
import type { CheckCategory, TestRunRow } from "@/lib/testing/types";

export function overviewStats(runs: TestRunRow[]) {
  const done = runs.filter((r) => r.status !== "running");
  const passed = done.filter((r) => r.status === "passed").length;
  const warning = done.filter((r) => r.status === "warning").length;
  const failed = done.filter((r) => r.status === "failed" || r.status === "error").length;
  const issues = done.reduce((s, r) => s + r.issues_count, 0);
  const critical = done.reduce((s, r) => s + r.critical_count, 0);
  const withDur = done.filter((r) => r.duration_ms != null);
  const avgDuration = withDur.length ? Math.round(withDur.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / withDur.length) : null;
  const avgScore = done.length ? Math.round(done.reduce((s, r) => s + (r.score ?? 0), 0) / done.length) : null;
  const passRate = done.length ? Math.round((passed / done.length) * 100) : null;
  return { total: done.length, passed, warning, failed, issues, critical, avgDuration, avgScore, passRate };
}

/** One bucket per day for the last `days` days, oldest first. */
export function dailyTrend(runs: TestRunRow[], days = 14) {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, i) => {
    const day = subDays(today, days - 1 - i);
    const next = subDays(day, -1);
    const inDay = runs.filter((r) => {
      const t = new Date(r.created_at);
      return t >= day && t < next;
    });
    const avg = inDay.length ? Math.round(inDay.reduce((s, r) => s + (r.score ?? 0), 0) / inDay.length) : null;
    return {
      date: format(day, "MMM d"),
      runs: inDay.length,
      score: avg,
      failed: inDay.filter((r) => r.status === "failed").length,
    };
  });
}

export function issuesByCategory(runs: TestRunRow[]) {
  const map = new Map<CheckCategory, { fail: number; warn: number }>();
  for (const r of runs)
    for (const c of r.checks) {
      if (c.status !== "fail" && c.status !== "warn") continue;
      const e = map.get(c.category) ?? { fail: 0, warn: 0 };
      e[c.status === "fail" ? "fail" : "warn"]++;
      map.set(c.category, e);
    }
  return (Object.keys(CATEGORY_LABELS) as CheckCategory[]).map((k) => ({
    category: CATEGORY_LABELS[k],
    fail: map.get(k)?.fail ?? 0,
    warn: map.get(k)?.warn ?? 0,
  }));
}

export function topIssues(runs: TestRunRow[], limit = 5) {
  const map = new Map<string, { name: string; count: number; severity: string; category: CheckCategory }>();
  for (const r of runs)
    for (const c of r.checks) {
      if (c.status !== "fail") continue;
      const key = c.id;
      const e = map.get(key) ?? { name: c.name.replace(/\s*\(.*\)$/, ""), count: 0, severity: c.severity, category: c.category };
      e.count++;
      map.set(key, e);
    }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}