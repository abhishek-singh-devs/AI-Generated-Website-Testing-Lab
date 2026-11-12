import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, BadgeCheck, Bug, Timer, ArrowRight, PlayCircle, FlaskConical, TrendingUp } from "lucide-react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { EmptyState, PageHeader, Panel, PanelHeader, StatCard } from "@/components/lab/common";
import { RunsTable } from "@/components/lab/runs-table";
import { SeverityBadge } from "@/components/lab/status";
import { runsQuery } from "@/lib/lab-data";
import { dailyTrend, issuesByCategory, overviewStats, topIssues } from "@/lib/stats";
import { fmtDuration } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/testing/constants";
import type { Severity, TestRunRow } from "@/lib/testing/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — AI Website Testing Lab" },
      { name: "description", content: "Pass rate, issues found and recent QA runs for your generated websites." },
      { property: "og:title", content: "Overview — AI Website Testing Lab" },
      { property: "og:description", content: "Pass rate, issues found and recent QA runs for your generated websites." },
    ],
  }),
  component: Dashboard,
});

const trendConfig = {
  score: { label: "Avg score", color: "var(--chart-1)" },
  runs: { label: "Runs", color: "var(--chart-5)" },
} satisfies ChartConfig;
const statusConfig = {
  passed: { label: "Passed", color: "var(--chart-2)" },
  warning: { label: "Warnings", color: "var(--chart-3)" },
  failed: { label: "Failed", color: "var(--chart-4)" },
} satisfies ChartConfig;
const catConfig = {
  fail: { label: "Failures", color: "var(--chart-4)" },
  warn: { label: "Warnings", color: "var(--chart-3)" },
} satisfies ChartConfig;

function Dashboard() {
  const { data: runs, isLoading, isError, refetch } = useQuery(runsQuery);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Health of every generated site you've tested. Sample runs are included so you can explore right away."
        actions={
          <Button asChild variant="glow">
            <Link to="/tests/new">
              <PlayCircle /> Run a test
            </Link>
          </Button>
        }
      />

      {isError ? (
        <Panel>
          <EmptyState icon={Bug} title="Couldn't load your runs" description="Check your connection and try again." action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>} />
        </Panel>
      ) : isLoading || !runs ? (
        <DashboardSkeleton />
      ) : runs.length === 0 ? (
        <Panel>
          <EmptyState
            icon={FlaskConical}
            title="No test runs yet"
            description="Paste the URL of a generated website and run your first QA pass. Results land here."
            action={<Button asChild variant="glow"><Link to="/tests/new">Start your first test</Link></Button>}
          />
        </Panel>
      ) : (
        <DashboardContent runs={runs} />
      )}
    </div>
  );
}

function DashboardContent({ runs }: { runs: TestRunRow[] }) {
  const s = overviewStats(runs);
  const trend = dailyTrend(runs, 14);
  const cats = issuesByCategory(runs);
  const top = topIssues(runs);
  const pie = [
    { key: "passed", value: s.passed, fill: "var(--color-passed)" },
    { key: "warning", value: s.warning, fill: "var(--color-warning)" },
    { key: "failed", value: s.failed, fill: "var(--color-failed)" },
  ];
  const last7 = runs.filter((r) => Date.now() - new Date(r.created_at).getTime() < 7 * 864e5).length;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tests run" value={s.total} icon={Activity} hint={<><TrendingUp className="size-3.5 text-success" /> {last7} in the last 7 days</>} />
        <StatCard label="Pass rate" value={`${s.passRate ?? 0}%`} icon={BadgeCheck} tone="success" hint={`${s.passed} passed · ${s.warning} with warnings`} />
        <StatCard label="Issues found" value={s.issues} icon={Bug} tone={s.critical ? "danger" : "warning"} hint={`${s.critical} critical across ${s.failed} failed runs`} />
        <StatCard label="Avg duration" value={fmtDuration(s.avgDuration)} icon={Timer} tone="primary" hint={`Avg score ${s.avgScore ?? "—"}/100`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Quality trend" description="Average score and run volume, last 14 days" />
          <div className="p-4 pt-6">
            <ChartContainer config={trendConfig} className="aspect-auto h-[240px] w-full">
              <ComposedChart data={trend} margin={{ left: -18, right: 8 }}>
                <defs>
                  <linearGradient id="fillScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-score)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--color-score)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis yAxisId="score" domain={[0, 100]} tickLine={false} axisLine={false} width={40} />
                <YAxis yAxisId="runs" orientation="right" hide domain={[0, "dataMax + 2"]} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Bar yAxisId="runs" dataKey="runs" fill="var(--color-runs)" fillOpacity={0.35} radius={[4, 4, 0, 0]} barSize={14} />
                <Area yAxisId="score" dataKey="score" type="monotone" stroke="var(--color-score)" strokeWidth={2} fill="url(#fillScore)" connectNulls />
              </ComposedChart>
            </ChartContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Results breakdown" description={`${s.total} completed runs`} />
          <div className="flex flex-col items-center gap-4 p-5">
            <ChartContainer config={statusConfig} className="aspect-square h-[170px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
                <Pie data={pie} dataKey="value" nameKey="key" innerRadius={52} outerRadius={78} strokeWidth={3} stroke="var(--card)">
                  {pie.map((p) => <Cell key={p.key} fill={p.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="grid w-full grid-cols-3 gap-2 text-center">
              {[
                { l: "Passed", v: s.passed, c: "text-success" },
                { l: "Warnings", v: s.warning, c: "text-warning" },
                { l: "Failed", v: s.failed, c: "text-destructive" },
              ].map((x) => (
                <div key={x.l} className="rounded-lg border border-border bg-surface px-2 py-2">
                  <div className={`font-mono text-lg font-semibold ${x.c}`}>{x.v}</div>
                  <div className="text-[11px] text-muted-foreground">{x.l}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Recent runs"
            description="Latest results across all profiles"
            actions={
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                <Link to="/history">View all <ArrowRight /></Link>
              </Button>
            }
          />
          <RunsTable runs={runs.slice(0, 7)} compact />
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Issues by category" description="Failures and warnings across all runs" />
            <div className="p-4">
              <ChartContainer config={catConfig} className="aspect-auto h-[190px] w-full">
                <BarChart data={cats} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="category" tickLine={false} axisLine={false} width={92} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="fail" stackId="a" fill="var(--color-fail)" radius={[4, 0, 0, 4]} />
                  <Bar dataKey="warn" stackId="a" fill="var(--color-warn)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Most common failures" />
            <ul className="divide-y divide-border/50">
              {top.length === 0 && <li className="px-5 py-6 text-sm text-muted-foreground">No failing checks yet. 🎉</li>}
              {top.map((t) => (
                <li key={t.name} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{CATEGORY_LABELS[t.category]}</div>
                  </div>
                  <SeverityBadge severity={t.severity as Severity} />
                  <span className="w-8 text-right font-mono text-sm tabular-nums text-muted-foreground">×{t.count}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[118px] rounded-xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[320px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[320px] rounded-xl" />
      </div>
      <Skeleton className="h-[360px] rounded-xl" />
    </div>
  );
}