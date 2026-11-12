import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, RotateCcw, Download, Trash2, FlaskConical, Lightbulb, Sparkles, SearchX, Clock, Globe, Monitor, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState, Panel, PanelHeader } from "@/components/lab/common";
import { ScoreRing } from "@/components/lab/score-ring";
import { CheckIcon, SeverityBadge, SourceBadge, StatusBadge, scoreTone } from "@/components/lab/status";
import { deleteRun, invalidateRuns, runQuery } from "@/lib/lab-data";
import { computeScore, weightOf } from "@/lib/testing/engine";
import { BROWSERS, CATEGORY_LABELS, DEVICES, PROFILES, SEVERITY_ORDER } from "@/lib/testing/constants";
import { displayHost } from "@/lib/testing/url";
import { fmtDate, fmtDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CheckCategory, CheckResult, Severity } from "@/lib/testing/types";

export const Route = createFileRoute("/_authenticated/runs/$runId")({
  head: () => ({
    meta: [
      { title: "Run report — AI Website Testing Lab" },
      { name: "description", content: "Scored QA report with pass/fail checks, issue severity and suggested fixes." },
      { property: "og:title", content: "Run report — AI Website Testing Lab" },
      { property: "og:description", content: "Scored QA report with pass/fail checks, issue severity and suggested fixes." },
    ],
  }),
  component: RunDetail,
});

function RunDetail() {
  const { runId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: run, isLoading, isError } = useQuery(runQuery(runId));
  const [sev, setSev] = useState<Severity | "all">("all");

  const derived = useMemo(() => {
    if (!run) return null;
    const issues = run.checks
      .filter((c) => c.status === "fail" || c.status === "warn")
      .sort((a, b) => (a.status === b.status ? 0 : a.status === "fail" ? -1 : 1) || weightOf(b.severity) - weightOf(a.severity));
    const byCat = new Map<CheckCategory, CheckResult[]>();
    for (const c of run.checks) byCat.set(c.category, [...(byCat.get(c.category) ?? []), c]);
    const counts = { pass: 0, fail: 0, warn: 0, skip: 0 };
    for (const c of run.checks) counts[c.status]++;
    const measured = run.checks.filter((c) => c.source === "measured").length;
    return { issues, byCat: [...byCat.entries()], counts, measured };
  }, [run]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }
  if (isError || !run || !derived) {
    return (
      <Panel>
        <EmptyState icon={SearchX} title="Run not found" description="It may have been deleted, or it belongs to another account." action={<Button asChild variant="outline"><Link to="/history">Back to history</Link></Button>} />
      </Panel>
    );
  }

  const { issues, byCat, counts, measured } = derived;
  const shownIssues = sev === "all" ? issues : issues.filter((i) => i.severity === sev);

  const exportJson = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(run, null, 2)], { type: "application/json" }));
    a.download = `run-${displayHost(run.url).replace(/[^a-z0-9]+/gi, "-")}-${run.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Report exported");
  };

  const remove = async () => {
    try {
      await deleteRun(run.id);
      await invalidateRuns(qc);
      toast.success("Run deleted");
      navigate({ to: "/history" });
    } catch (e) {
      toast.error("Couldn't delete run", { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/history" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Test history
        </Link>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-[28px]">{displayHost(run.url)}</h1>
              <StatusBadge status={run.status} />
              {run.is_sample && <Badge variant="muted" className="rounded-full">Sample</Badge>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <a href={run.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-mono hover:text-foreground">
                <Globe className="size-3.5" /> {run.url} <ExternalLink className="size-3" />
              </a>
              <span className="inline-flex items-center gap-1"><ListChecks className="size-3.5" /> {PROFILES[run.profile]?.label}</span>
              <span className="inline-flex items-center gap-1"><Monitor className="size-3.5" /> {BROWSERS[run.browser]?.label} · {DEVICES[run.device]?.label} ({DEVICES[run.device]?.viewport})</span>
              <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {fmtDate(run.created_at)} · {fmtDuration(run.duration_ms)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="glow" onClick={() => navigate({ to: "/tests/new", search: { rerun: run.id } })}>
              <RotateCcw /> Re-run
            </Button>
            <Button variant="outline" onClick={exportJson}><Download /> Export</Button>
            {!run.is_sample && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Delete run"><Trash2 /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this run?</AlertDialogTitle>
                    <AlertDialogDescription>The report for {displayHost(run.url)} will be removed from your history. This can't be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning/8 px-4 py-3 text-xs leading-relaxed text-warning">
        <FlaskConical className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {run.is_sample ? "Sample run — demo data. " : ""}
          {measured > 0
            ? `${measured} of ${run.checks.length} checks were measured from a live fetch of the page. The rest are simulated — no real browser was launched.`
            : "Every check in this run is simulated demo output — no real browser or AI reviewer was used."}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel className="flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center lg:flex-col xl:flex-row">
          <ScoreRing score={run.score ?? 0} size={136} />
          <div className="grid w-full grid-cols-2 gap-2">
            {[
              { l: "Passed", v: counts.pass, s: "pass" as const },
              { l: "Failed", v: counts.fail, s: "fail" as const },
              { l: "Warnings", v: counts.warn, s: "warn" as const },
              { l: "Skipped", v: counts.skip, s: "skip" as const },
            ].map((x) => (
              <div key={x.l} className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5">
                <CheckIcon status={x.s} />
                <div>
                  <div className="font-mono text-lg font-semibold leading-none tabular-nums">{x.v}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{x.l}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={<span className="inline-flex items-center gap-1.5"><Sparkles className="size-4 text-primary-glow" /> AI test summary</span>} description="Generated from the check results (simulated reviewer)" />
          <div className="space-y-4 p-5">
            <p className="text-sm leading-relaxed text-foreground/90">{run.summary}</p>
            {run.instructions && (
              <div className="rounded-lg border border-border bg-surface p-3 text-xs">
                <div className="mb-1 font-medium text-muted-foreground">Custom instructions</div>
                <div className="text-foreground/90">{run.instructions}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {byCat.map(([cat, checks]) => {
                const s = computeScore(checks);
                return (
                  <div key={cat} className="rounded-lg border border-border bg-surface px-3 py-2">
                    <div className="text-[11px] text-muted-foreground">{CATEGORY_LABELS[cat]}</div>
                    <div className="flex items-baseline justify-between">
                      <span className={cn("font-mono text-lg font-semibold", scoreTone(s))}>{s}</span>
                      <span className="text-[11px] text-muted-foreground">{checks.filter((c) => c.status === "pass").length}/{checks.filter((c) => c.status !== "skip").length}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>

      <Tabs defaultValue="issues">
        <TabsList className="h-10">
          <TabsTrigger value="issues" className="gap-1.5">Issues <Badge variant="muted" className="rounded-full px-1.5 py-0">{issues.length}</Badge></TabsTrigger>
          <TabsTrigger value="checks" className="gap-1.5">All checks <Badge variant="muted" className="rounded-full px-1.5 py-0">{run.checks.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="mt-4 space-y-3">
          {issues.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(["all", ...SEVERITY_ORDER] as const).map((s) => {
                const n = s === "all" ? issues.length : issues.filter((i) => i.severity === s).length;
                if (s !== "all" && n === 0) return null;
                return (
                  <button key={s} onClick={() => setSev(s)} className={cn("rounded-full border px-3 py-1 text-xs capitalize transition-colors", sev === s ? "border-primary/50 bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
                    {s} <span className="ml-1 font-mono opacity-70">{n}</span>
                  </button>
                );
              })}
            </div>
          )}
          {shownIssues.length === 0 ? (
            <Panel><EmptyState icon={Sparkles} title="No issues found" description="Every check in this run passed. Nice work." /></Panel>
          ) : (
            shownIssues.map((c) => <IssueCard key={c.id} check={c} />)
          )}
        </TabsContent>

        <TabsContent value="checks" className="mt-4 space-y-4">
          {byCat.map(([cat, checks]) => (
            <Panel key={cat}>
              <PanelHeader title={CATEGORY_LABELS[cat]} description={`${checks.filter((c) => c.status === "pass").length} of ${checks.length} passed`} />
              <ul className="divide-y divide-border/50">
                {checks.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 px-5 py-3">
                    <CheckIcon status={c.status} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{c.name}</span>
                        {c.status !== "pass" && c.status !== "skip" && <SeverityBadge severity={c.severity} />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.message}</p>
                    </div>
                    <div className="hidden shrink-0 items-center gap-2 sm:flex">
                      <SourceBadge source={c.source} />
                      <span className="w-14 text-right font-mono text-[11px] text-muted-foreground">{fmtDuration(c.durationMs)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IssueCard({ check: c }: { check: CheckResult }) {
  return (
    <div className={cn("surface-panel overflow-hidden border-l-2", c.status === "fail" ? (c.severity === "critical" || c.severity === "high" ? "border-l-destructive" : "border-l-warning") : "border-l-warning/60")}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <CheckIcon status={c.status} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{c.name}</h3>
            <SeverityBadge severity={c.severity} />
            <Badge variant="muted" className="rounded-full px-2 py-0 text-[11px] font-normal">{CATEGORY_LABELS[c.category]}</Badge>
            <SourceBadge source={c.source} />
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{c.message}</p>
          {c.suggestion && (
            <div className="mt-3 flex gap-2 rounded-lg border border-primary/20 bg-primary/8 p-3 text-sm">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary-glow" />
              <span className="text-foreground/90">{c.suggestion}</span>
            </div>
          )}
        </div>
        <span className="hidden font-mono text-[11px] uppercase text-muted-foreground sm:block">{c.status === "fail" ? "Fail" : "Warn"}</span>
      </div>
    </div>
  );
}