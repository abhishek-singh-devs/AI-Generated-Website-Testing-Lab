import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Globe,
  Zap,
  Accessibility,
  MonitorSmartphone,
  Gauge,
  Search,
  Layers3,
  Monitor,
  Laptop,
  Tablet,
  Smartphone,
  Play,
  Square,
  CheckCircle2,
  Loader2,
  Circle,
  FlaskConical,
  Radar,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, Panel, PanelHeader } from "@/components/lab/common";
import { ScoreRing } from "@/components/lab/score-ring";
import { StatusBadge, CheckIcon } from "@/components/lab/status";
import { useTestRunner, type LogLine } from "@/hooks/use-test-runner";
import { insertRun, invalidateRuns, runQuery, settingsQuery, suitesQuery, keys } from "@/lib/lab-data";
import { BROWSERS, BROWSER_IDS, DEVICES, DEVICE_IDS, PROFILES, PROFILE_IDS } from "@/lib/testing/constants";
import { validateUrl } from "@/lib/testing/url";
import { fmtDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BrowserId, DeviceId, TestProfile } from "@/lib/testing/types";

type NewTestSearch = { rerun?: string | undefined; suite?: string | undefined; url?: string | undefined };

export const Route = createFileRoute("/_authenticated/tests/new")({
  validateSearch: (s: Record<string, unknown>): NewTestSearch => ({
    rerun: typeof s["rerun"] === "string" ? s["rerun"] : undefined,
    suite: typeof s["suite"] === "string" ? s["suite"] : undefined,
    url: typeof s["url"] === "string" ? s["url"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "New test — AI Website Testing Lab" },
      { name: "description", content: "Configure and run a QA test against any generated website." },
      { property: "og:title", content: "New test — AI Website Testing Lab" },
      { property: "og:description", content: "Configure and run a QA test against any generated website." },
    ],
  }),
  component: NewTestPage,
});

const PROFILE_ICON: Record<TestProfile, typeof Zap> = {
  smoke: Zap,
  accessibility: Accessibility,
  responsive: MonitorSmartphone,
  performance: Gauge,
  seo: Search,
  comprehensive: Layers3,
};
const DEVICE_ICON: Record<DeviceId, typeof Monitor> = { desktop: Monitor, laptop: Laptop, tablet: Tablet, mobile: Smartphone };
const EXAMPLES = ["example.com", "developer.mozilla.org", "lovable.dev"];

function NewTestPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const settings = useQuery(settingsQuery);
  const rerunQ = useQuery({ ...runQuery(search.rerun ?? "none"), enabled: Boolean(search.rerun) });
  const suites = useQuery({ ...suitesQuery, enabled: Boolean(search.suite) });

  const [url, setUrl] = useState(search.url ?? "");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [profile, setProfile] = useState<TestProfile>("comprehensive");
  const [browser, setBrowser] = useState<BrowserId>("chromium");
  const [device, setDevice] = useState<DeviceId>("desktop");
  const [instructions, setInstructions] = useState("");
  const [suiteId, setSuiteId] = useState<string | null>(null);
  const [savedRunId, setSavedRunId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const prefilled = useRef(false);
  const autoStarted = useRef(false);
  const { state, start, cancel, reset } = useTestRunner();

  // Apply defaults from settings, then re-run / suite prefill.
  useEffect(() => {
    if (prefilled.current || !settings.data) return;
    if (search.rerun && !rerunQ.data && !rerunQ.isError) return;
    if (search.suite && !suites.data) return;
    prefilled.current = true;
    setProfile(settings.data.default_profile);
    setBrowser(settings.data.default_browser);
    setDevice(settings.data.default_device);
    if (rerunQ.data) {
      const r = rerunQ.data;
      setUrl(r.url);
      setProfile(r.profile);
      setBrowser(r.browser);
      setDevice(r.device);
      setInstructions(r.instructions ?? "");
      setSuiteId(r.suite_id);
    } else if (search.suite && suites.data) {
      const s = suites.data.find((x) => x.id === search.suite);
      if (s) {
        setUrl(s.target_url);
        setProfile(s.profile);
        setBrowser(s.browsers[0] ?? "chromium");
        setDevice(s.devices[0] ?? "desktop");
        setSuiteId(s.id);
      }
    }
  }, [settings.data, rerunQ.data, rerunQ.isError, suites.data, search.rerun, search.suite]);

  const runTest = async (cfg?: { url: string; profile: TestProfile; browser: BrowserId; device: DeviceId; instructions: string; suiteId: string | null }) => {
    const c = cfg ?? { url, profile, browser, device, instructions, suiteId };
    const v = validateUrl(c.url);
    if (!v.ok) {
      setUrlError(v.error);
      toast.error(v.error);
      return;
    }
    setUrlError(null);
    setUrl(v.url);
    setSavedRunId(null);
    toast.message("Test started", { description: `${PROFILES[c.profile].label} run on ${v.host}` });
    const result = await start({
      url: v.url,
      profile: c.profile,
      browser: c.browser,
      device: c.device,
      instructions: c.instructions.trim() || null,
      suiteId: c.suiteId,
      liveProbe: settings.data?.live_probe ?? true,
      passThreshold: settings.data?.pass_threshold ?? 80,
    });
    if (!result) return;
    setSaving(true);
    try {
      const o = result.outcome;
      const id = await insertRun({
        url: v.url,
        profile: c.profile,
        browser: c.browser,
        device: c.device,
        instructions: c.instructions.trim() || null,
        suite_id: c.suiteId,
        status: o.status,
        score: o.score,
        duration_ms: o.durationMs,
        checks: o.checks,
        summary: o.summary,
        issues_count: o.issuesCount,
        critical_count: o.criticalCount,
        mode: o.mode,
        created_at: new Date(result.startedAt).toISOString(),
      });
      setSavedRunId(id);
      await invalidateRuns(qc);
      qc.removeQueries({ queryKey: keys.run(id) });
      const fn = o.status === "passed" ? toast.success : o.status === "warning" ? toast.warning : toast.error;
      fn(`Run complete — ${o.score}/100`, {
        description: `${o.issuesCount} issue${o.issuesCount === 1 ? "" : "s"} found. Saved to history.`,
        action: { label: "View report", onClick: () => navigate({ to: "/runs/$runId", params: { runId: id } }) },
      });
    } catch (e) {
      toast.error("Couldn't save this run", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  // Re-run: start automatically once the original run is loaded.
  useEffect(() => {
    if (!search.rerun || autoStarted.current || !prefilled.current || !rerunQ.data) return;
    autoStarted.current = true;
    const r = rerunQ.data;
    void runTest({ url: r.url, profile: r.profile, browser: r.browser, device: r.device, instructions: r.instructions ?? "", suiteId: r.suite_id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rerunQ.data, prefilled.current]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runTest();
  };

  const startOver = () => {
    reset();
    setSavedRunId(null);
    navigate({ to: "/tests/new", search: {}, replace: true });
  };

  const loadingPrefill = (search.rerun && rerunQ.isLoading) || (search.suite && suites.isLoading) || settings.isLoading;

  if (state.phase !== "idle") {
    return (
      <RunConsole
        url={url}
        profile={profile}
        browser={browser}
        device={device}
        state={state}
        saving={saving}
        savedRunId={savedRunId}
        onCancel={() => {
          cancel();
          toast("Run cancelled", { description: "Nothing was saved." });
        }}
        onRunAgain={() => void runTest()}
        onNew={startOver}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New test"
        description={
          <>
            Point the lab at a generated website and choose what to check.{" "}
            <span className="text-foreground/80">Demo mode:</span> the page is fetched for real; browser rendering and AI review are simulated.
          </>
        }
      />

      {search.rerun && rerunQ.isError && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertCircle className="size-4" /> The run you wanted to repeat couldn't be found. Configure a new test below.
        </div>
      )}

      {loadingPrefill ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-[560px] rounded-xl" />
          <Skeleton className="h-[320px] rounded-xl" />
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_340px]" noValidate>
          <div className="space-y-6">
            <Panel>
              <PanelHeader title="1 · Website" description="Paste any public URL. Bare domains get https:// added." />
              <div className="p-5">
                <Label htmlFor="url" className="sr-only">Website URL</Label>
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="url"
                    inputMode="url"
                    autoComplete="url"
                    placeholder="https://your-generated-site.lovable.app"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (urlError) setUrlError(null);
                    }}
                    onBlur={() => {
                      if (url.trim()) {
                        const v = validateUrl(url);
                        setUrlError(v.ok ? null : v.error);
                      }
                    }}
                    aria-invalid={Boolean(urlError)}
                    aria-describedby="url-help"
                    className={cn("h-12 pl-10 font-mono text-[15px]", urlError && "border-destructive focus-visible:ring-destructive")}
                  />
                </div>
                <div id="url-help" className="mt-2 min-h-5 text-xs">
                  {urlError ? (
                    <span className="flex items-center gap-1.5 text-destructive"><AlertCircle className="size-3.5" />{urlError}</span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
                      Try:
                      {EXAMPLES.map((ex) => (
                        <button key={ex} type="button" onClick={() => setUrl(`https://${ex}`)} className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-foreground/80 transition-colors hover:border-primary/40 hover:text-foreground">
                          {ex}
                        </button>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="2 · Test profile" description="What should the lab look for?" />
              <div role="radiogroup" aria-label="Test profile" className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
                {PROFILE_IDS.map((id) => {
                  const P = PROFILES[id];
                  const Icon = PROFILE_ICON[id];
                  const active = profile === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setProfile(id)}
                      className={cn(
                        "group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "border-primary/60 bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-primary/30 hover:bg-accent/40",
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className={cn("grid size-9 place-items-center rounded-lg border", active ? "border-primary/40 bg-primary/20 text-primary-glow" : "border-border bg-surface-raised text-muted-foreground group-hover:text-foreground")}>
                          <Icon className="size-4" />
                        </span>
                        <span className={cn("size-4 rounded-full border-2 transition-colors", active ? "border-primary bg-primary shadow-[inset_0_0_0_3px_var(--card)]" : "border-muted-foreground/40")} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{P.label}</div>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{P.description}</p>
                      </div>
                      <span className="mt-auto font-mono text-[11px] text-muted-foreground">~{P.estSeconds}s · {P.categories.length} area{P.categories.length > 1 ? "s" : ""}</span>
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="3 · Environment" description="Browser engine and viewport to emulate (simulated)." />
              <div className="grid gap-6 p-5 md:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Browser</Label>
                  <div role="radiogroup" aria-label="Browser" className="grid grid-cols-2 gap-2">
                    {BROWSER_IDS.map((b) => (
                      <ChoiceChip key={b} active={browser === b} onClick={() => setBrowser(b)} title={BROWSERS[b].label} subtitle={BROWSERS[b].engine} />
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Device</Label>
                  <div role="radiogroup" aria-label="Device" className="grid grid-cols-2 gap-2">
                    {DEVICE_IDS.map((d) => {
                      const I = DEVICE_ICON[d];
                      return <ChoiceChip key={d} active={device === d} onClick={() => setDevice(d)} title={DEVICES[d].label} subtitle={DEVICES[d].viewport} icon={<I className="size-4" />} />;
                    })}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="4 · Instructions" description="Optional. Describe a journey or rule for the AI reviewer to check." />
              <div className="p-5">
                <Textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value.slice(0, 1000))}
                  placeholder="e.g. Add a product to the cart and confirm the checkout button is reachable by keyboard"
                  rows={3}
                  className="resize-y"
                />
                <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><FlaskConical className="size-3" /> Custom instructions are evaluated by a simulated reviewer in this demo.</span>
                  <span className="font-mono">{instructions.length}/1000</span>
                </div>
              </div>
            </Panel>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Panel className="overflow-hidden">
              <div className="relative border-b border-border/70 bg-glow px-5 py-4">
                <h2 className="text-sm font-semibold">Run summary</h2>
                <p className="text-xs text-muted-foreground">Review before you launch</p>
              </div>
              <dl className="space-y-3 px-5 py-4 text-sm">
                <SummaryRow label="Target" value={url ? <span className="truncate font-mono text-xs">{url.replace(/^https?:\/\//, "")}</span> : <span className="text-muted-foreground">Not set</span>} />
                <SummaryRow label="Profile" value={PROFILES[profile].label} />
                <SummaryRow label="Browser" value={BROWSERS[browser].label} />
                <SummaryRow label="Device" value={`${DEVICES[device].label} · ${DEVICES[device].viewport}`} />
                <SummaryRow label="Est. time" value={<span className="font-mono">~{PROFILES[profile].estSeconds}s</span>} />
                {suiteId && <SummaryRow label="Suite" value={<Badge variant="primary" className="rounded-full">Linked</Badge>} />}
              </dl>
              <div className="mx-5 mb-4 space-y-2 rounded-lg border border-border bg-surface p-3 text-[11px] leading-relaxed text-muted-foreground">
                <div className="flex gap-2">
                  <Radar className="mt-0.5 size-3.5 shrink-0 text-primary-glow" />
                  <span><span className="text-foreground">Measured:</span> HTTP status, response time, size, headers and HTML markup {settings.data?.live_probe === false && <em>(disabled in Settings)</em>}</span>
                </div>
                <div className="flex gap-2">
                  <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-warning" />
                  <span><span className="text-foreground">Simulated:</span> rendering, overflow, contrast, Core Web Vitals, console errors, AI review</span>
                </div>
              </div>
              <div className="border-t border-border/70 p-5">
                <Button type="submit" variant="glow" size="xl" className="w-full">
                  <Play className="fill-current" /> Run test
                </Button>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">Results are saved to Test History.</p>
              </div>
            </Panel>
          </aside>
        </form>
      )}
    </div>
  );
}

function ChoiceChip({ active, onClick, title, subtitle, icon }: { active: boolean; onClick: () => void; title: string; subtitle: string; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-primary/60 bg-primary/12 text-foreground" : "border-border bg-surface text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      {icon && <span className={active ? "text-primary-glow" : ""}>{icon}</span>}
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate font-mono text-[10px] opacity-70">{subtitle}</span>
      </span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function RunConsole({
  url,
  profile,
  browser,
  device,
  state,
  saving,
  savedRunId,
  onCancel,
  onRunAgain,
  onNew,
}: {
  url: string;
  profile: TestProfile;
  browser: BrowserId;
  device: DeviceId;
  state: ReturnType<typeof useTestRunner>["state"];
  saving: boolean;
  savedRunId: string | null;
  onCancel: () => void;
  onRunAgain: () => void;
  onNew: () => void;
}) {
  const logRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(Date.now());
  const running = state.phase === "running";
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [state.logs.length]);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);
  const elapsed = state.startedAt ? now - state.startedAt : 0;
  const o = state.outcome;
  const counts = useMemo(() => {
    const c = { pass: 0, fail: 0, warn: 0 };
    if (o) for (const x of o.checks) if (x.status in c) c[x.status as keyof typeof c]++;
    return c;
  }, [o]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={running ? "Running test…" : state.phase === "done" ? "Test complete" : state.phase === "cancelled" ? "Run cancelled" : "Run failed"}
        description={<span className="font-mono text-xs">{url}</span>}
        actions={
          running ? (
            <Button variant="outline" onClick={onCancel}><Square className="fill-current" /> Cancel</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onNew}>New test</Button>
              <Button variant="soft" onClick={onRunAgain}><RotateCcw /> Run again</Button>
            </>
          )
        }
      />

      <div className="flex items-center gap-2 rounded-lg border border-warning/25 bg-warning/8 px-4 py-2.5 text-xs text-warning">
        <FlaskConical className="size-3.5 shrink-0" />
        Demo execution — results combine a real page fetch with simulated browser and AI checks. No real browser is launched.
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Panel className="h-fit">
          <div className="border-b border-border/70 px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{PROFILES[profile].label}</span>
              <span className="font-mono text-xs text-muted-foreground">{fmtDuration(Math.round(elapsed))}</span>
            </div>
            <Progress value={state.progress} className="mt-3 h-1.5" aria-label="Run progress" />
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
              <span>{BROWSERS[browser].label} · {DEVICES[device].label}</span>
              <span className="font-mono">{Math.round(state.progress)}%</span>
            </div>
          </div>
          <ol className="space-y-1 p-3">
            {state.steps.map((step, i) => {
              const done = state.phase === "done" || i < state.stepIndex;
              const active = running && i === state.stepIndex;
              return (
                <li key={step} className={cn("flex items-start gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors", active && "bg-primary/10")}>
                  {done ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  ) : active ? (
                    <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary-glow" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" />
                  )}
                  <span className={cn(done ? "text-foreground/80" : active ? "text-foreground" : "text-muted-foreground")}>{step}</span>
                </li>
              );
            })}
          </ol>
        </Panel>

        <div className="space-y-6">
          {state.phase === "done" && o && (
            <Panel className="animate-fade-up overflow-hidden">
              <div className="flex flex-col items-center gap-6 p-6 sm:flex-row">
                <ScoreRing score={o.score} />
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <StatusBadge status={o.status} />
                    <Badge variant="muted" className="rounded-full">{o.mode === "hybrid" ? "Live fetch + simulation" : "Fully simulated"}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{o.summary}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm sm:justify-start">
                    <span className="flex items-center gap-1.5"><CheckIcon status="pass" /> {counts.pass} passed</span>
                    <span className="flex items-center gap-1.5"><CheckIcon status="warn" /> {counts.warn} warnings</span>
                    <span className="flex items-center gap-1.5"><CheckIcon status="fail" /> {counts.fail} failed</span>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto">
                  {savedRunId ? (
                    <Button asChild variant="glow">
                      <Link to="/runs/$runId" params={{ runId: savedRunId }}>View full report <ArrowRight /></Link>
                    </Button>
                  ) : (
                    <Button variant="glow" disabled>{saving ? <><Loader2 className="animate-spin" /> Saving…</> : "Not saved"}</Button>
                  )}
                </div>
              </div>
            </Panel>
          )}

          {state.phase === "error" && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">The run stopped unexpectedly: {state.error}</div>
          )}

          <div className="overflow-hidden rounded-xl border border-border bg-terminal shadow-card">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-2.5">
              <Terminal className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Run log</span>
              {running && <span className="ml-auto flex items-center gap-1.5 text-[11px] text-info"><span className="size-1.5 animate-pulse rounded-full bg-info" /> live</span>}
            </div>
            <div ref={logRef} className="h-[380px] overflow-y-auto p-4 font-mono text-[12px] leading-relaxed" role="log" aria-live="polite">
              {state.logs.map((l) => <LogRow key={l.id} line={l} start={state.startedAt ?? l.at} />)}
              {running && <div className="mt-1 inline-block h-3.5 w-1.5 animate-pulse bg-primary-glow align-middle" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogRow({ line, start }: { line: LogLine; start: number }) {
  const t = ((line.at - start) / 1000).toFixed(1).padStart(5, " ");
  const tone = {
    info: "text-primary-glow",
    ok: "text-success",
    warn: "text-warning",
    fail: "text-destructive",
    muted: "text-muted-foreground",
  }[line.level];
  const mark = { info: "›", ok: "✓", warn: "!", fail: "✗", muted: " " }[line.level];
  return (
    <div className="flex gap-3 whitespace-pre-wrap break-words">
      <span className="shrink-0 select-none text-muted-foreground/50">{t}s</span>
      <span className={cn("w-3 shrink-0", tone)}>{mark}</span>
      <span className={cn(line.level === "info" ? "font-semibold text-foreground" : "text-foreground/85", line.level === "muted" && "text-muted-foreground")}>{line.text}</span>
    </div>
  );
}