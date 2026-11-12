import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search, X, History as HistoryIcon, SearchX, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, Panel } from "@/components/lab/common";
import { RunsTable } from "@/components/lab/runs-table";
import { runsQuery } from "@/lib/lab-data";
import { PROFILES, PROFILE_IDS } from "@/lib/testing/constants";
import type { RunStatus, TestProfile, TestRunRow } from "@/lib/testing/types";

const STATUSES = ["all", "passed", "warning", "failed"] as const;
const RANGES = { all: "All time", "24h": "Last 24 hours", "7d": "Last 7 days", "30d": "Last 30 days" } as const;
const SOURCES = { all: "All runs", mine: "My runs", sample: "Sample runs" } as const;
const PAGE_SIZE = 15;

type HistorySearch = {
  q?: string | undefined;
  status?: (typeof STATUSES)[number] | undefined;
  profile?: TestProfile | "all" | undefined;
  range?: keyof typeof RANGES | undefined;
  source?: keyof typeof SOURCES | undefined;
  page?: number | undefined;
};

export const Route = createFileRoute("/_authenticated/history")({
  validateSearch: (s: Record<string, unknown>): HistorySearch => {
    const str = (k: string) => (typeof s[k] === "string" ? (s[k] as string) : undefined);
    const status = str("status");
    const profile = str("profile");
    const range = str("range");
    const source = str("source");
    const page = Number(s["page"]);
    return {
      q: str("q") || undefined,
      status: STATUSES.includes(status as never) ? (status as HistorySearch["status"]) : undefined,
      profile: profile && (PROFILE_IDS as string[]).includes(profile) ? (profile as TestProfile) : undefined,
      range: range && range in RANGES ? (range as HistorySearch["range"]) : undefined,
      source: source && source in SOURCES ? (source as HistorySearch["source"]) : undefined,
      page: Number.isFinite(page) && page > 1 ? Math.floor(page) : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Test history — AI Website Testing Lab" },
      { name: "description", content: "Search and filter every QA run by site, status, profile and date." },
      { property: "og:title", content: "Test history — AI Website Testing Lab" },
      { property: "og:description", content: "Search and filter every QA run by site, status, profile and date." },
    ],
  }),
  component: HistoryPage,
});

/** Pure filter used by the page (exported for tests). */
export function filterRuns(runs: TestRunRow[], f: HistorySearch, now = Date.now()): TestRunRow[] {
  const q = f.q?.trim().toLowerCase();
  const cutoff = f.range === "24h" ? now - 864e5 : f.range === "7d" ? now - 7 * 864e5 : f.range === "30d" ? now - 30 * 864e5 : null;
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

function HistoryPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/history" });
  const { data: runs, isLoading } = useQuery(runsQuery);
  const [q, setQ] = useState(search.q ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.q ?? "") !== q) navigate({ search: (p) => ({ ...p, q: q || undefined, page: undefined }), replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [q, search.q, navigate]);

  const set = (patch: Partial<HistorySearch>) => navigate({ search: (p) => ({ ...p, ...patch, page: undefined }), replace: true });
  const filtered = useMemo(() => (runs ? filterRuns(runs, search) : []), [runs, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(search.page ?? 1, pages);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const active = Boolean(search.q || (search.status && search.status !== "all") || (search.profile && search.profile !== "all") || search.range || search.source);

  const exportCsv = () => {
    const rows = [["date", "url", "profile", "browser", "device", "status", "score", "issues", "critical", "duration_ms", "sample"]];
    for (const r of filtered) rows.push([r.created_at, r.url, r.profile, r.browser, r.device, r.status, String(r.score ?? ""), String(r.issues_count), String(r.critical_count), String(r.duration_ms ?? ""), String(r.is_sample)]);
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "test-history.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test history"
        description="Every run you've started, plus the shared sample runs. Click a row for the full report."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download /> Export CSV
          </Button>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by URL, instructions or summary…" className="h-10 pl-9" aria-label="Search runs" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
            <Select value={search.status ?? "all"} onValueChange={(v) => set({ status: v === "all" ? undefined : (v as HistorySearch["status"]) })}>
              <SelectTrigger className="h-10 lg:w-[140px]" aria-label="Status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="warning">Warnings</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={search.profile ?? "all"} onValueChange={(v) => set({ profile: v === "all" ? undefined : (v as TestProfile) })}>
              <SelectTrigger className="h-10 lg:w-[160px]" aria-label="Profile"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All profiles</SelectItem>
                {PROFILE_IDS.map((p) => <SelectItem key={p} value={p}>{PROFILES[p].label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={search.range ?? "all"} onValueChange={(v) => set({ range: v === "all" ? undefined : (v as HistorySearch["range"]) })}>
              <SelectTrigger className="h-10 lg:w-[150px]" aria-label="Date range"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(RANGES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={search.source ?? "all"} onValueChange={(v) => set({ source: v === "all" ? undefined : (v as HistorySearch["source"]) })}>
              <SelectTrigger className="h-10 lg:w-[140px]" aria-label="Source"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SOURCES).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {active && (
            <Button variant="ghost" size="sm" className="self-start lg:self-auto" onClick={() => { setQ(""); navigate({ search: {}, replace: true }); }}>
              <X /> Clear
            </Button>
          )}
        </div>

        {isLoading || !runs ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : runs.length === 0 ? (
          <EmptyState icon={HistoryIcon} title="No runs yet" description="Your test runs will appear here." action={<Button asChild variant="glow"><Link to="/tests/new">Run a test</Link></Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={SearchX} title="No runs match these filters" description="Try a different search term or clear the filters." action={<Button variant="outline" onClick={() => { setQ(""); navigate({ search: {}, replace: true }); }}>Clear filters</Button>} />
        ) : (
          <>
            <RunsTable runs={visible} />
            <div className="flex items-center justify-between border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} run{filtered.length === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-8" disabled={page <= 1} onClick={() => navigate({ search: (p) => ({ ...p, page: page - 1 > 1 ? page - 1 : undefined }) })} aria-label="Previous page"><ChevronLeft /></Button>
                <span className="px-2 font-mono">{page}/{pages}</span>
                <Button variant="ghost" size="icon" className="size-8" disabled={page >= pages} onClick={() => navigate({ search: (p) => ({ ...p, page: page + 1 }) })} aria-label="Next page"><ChevronRight /></Button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}