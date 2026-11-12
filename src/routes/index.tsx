import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRight, CheckCircle2, Clock3, Gauge, History, Layers3, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/lab/common";
import { ScoreRing } from "@/components/lab/score-ring";
import { PROFILES, PROFILE_IDS } from "@/lib/testing/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SiteCheck Studio — AI Website Testing Lab" },
      { name: "description", content: "A polished QA workspace for AI-generated websites. Measure page responses, review prioritized findings, and organize demo test runs." },
      { property: "og:title", content: "SiteCheck Studio — AI Website Testing Lab" },
      { property: "og:description", content: "Measure what can be measured. Clearly label simulated browser and AI checks." },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Activity, title: "Real response checks", description: "Capture HTTP status, response timing, headers, and HTML metadata from a server-side page fetch." },
  { icon: ShieldCheck, title: "Safer URL validation", description: "Normalize website addresses and reject unsupported protocols, credentials, and local or private targets." },
  { icon: Gauge, title: "Prioritized QA findings", description: "Review weighted scores, severity labels, clear explanations, and suggested fixes in one report." },
  { icon: Layers3, title: "Reusable test suites", description: "Save a URL, profile, browser, device, and schedule preference for repeatable manual runs." },
  { icon: History, title: "Searchable run history", description: "Find previous reports by URL, status, profile, date range, or sample-versus-personal source." },
  { icon: SlidersHorizontal, title: "Workspace defaults", description: "Set your preferred profile, browser, device, pass threshold, and demo notification preferences." },
];

const previewChecks = [
  { name: "HTTP response", detail: "200 OK · measured", status: "pass" as const },
  { name: "Page metadata", detail: "Title + description · measured", status: "pass" as const },
  { name: "Mobile layout", detail: "Viewport review · simulated", status: "demo" as const },
  { name: "AI review", detail: "Suggested fixes · simulated", status: "demo" as const },
];

const steps = [
  { number: "01", title: "Enter a website", description: "Paste a public URL and choose a QA profile, browser, and device." },
  { number: "02", title: "Watch the demo run", description: "Follow a step-by-step progress console while measured and simulated checks are kept distinct." },
  { number: "03", title: "Triage the report", description: "Use the score, severity, and fix suggestions to decide what to investigate next." },
];

function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-35" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-glow opacity-35" aria-hidden />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Link to="/" aria-label="SiteCheck Studio home" className="flex shrink-0 items-center gap-2.5">
          <Logo />
          <span className="text-sm font-semibold tracking-tight sm:text-base">SiteCheck Studio</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Main navigation">
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="#profiles" className="transition-colors hover:text-foreground">Profiles</a>
          <a href="#workflow" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#execution" className="transition-colors hover:text-foreground">Demo limits</a>
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button variant="ghost" size="sm" asChild><Link to="/auth">Sign in</Link></Button>
          <Button variant="glow" size="sm" asChild>
            <Link to="/auth" search={{ redirect: "/dashboard" }}>Open the lab <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" className="rounded-full px-3 py-1"><Sparkles className="mr-1.5 size-3.5" /> QA workspace for generated sites</Badge>
              <Badge variant="warning" className="rounded-full px-3 py-1">Demo execution</Badge>
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Test generated websites
              <span className="mt-1 block text-gradient">before they ship.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Turn a public URL into a structured QA report. Check real page responses and markup, then explore clearly labeled demo findings for browser rendering and AI review.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button variant="glow" size="lg" asChild><Link to="/auth" search={{ redirect: "/dashboard" }}>Open the lab <ArrowRight className="size-4" /></Link></Button>
              <Button variant="outline" size="lg" asChild><a href="#features">Explore capabilities</a></Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground sm:text-sm">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /> Measured fetch checks</span>
              <span className="inline-flex items-center gap-2"><Clock3 className="size-4 text-primary-glow" /> Progress + run history</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-primary-glow" /> Demo limits made explicit</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[2rem] bg-primary/10 blur-3xl" aria-hidden />
            <section className="surface-panel relative overflow-hidden rounded-2xl border border-border/80 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
                <div><p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Sample report</p><p className="mt-1 text-sm font-semibold">example.com</p></div>
                <Badge variant="warning" className="rounded-full">Simulated preview</Badge>
              </div>
              <div className="flex flex-col items-center gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
                <ScoreRing score={86} size={116} stroke={9} label="Demo score" />
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <Badge variant="success" className="rounded-full">Sample status · Passed</Badge>
                    <Badge variant="muted" className="rounded-full">Smoke + SEO</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">A visual example of how measured page facts and simulated review findings are presented together.</p>
                </div>
              </div>
              <div className="space-y-1 px-4 pb-4 sm:px-5 sm:pb-5">
                {previewChecks.map((check) => (
                  <div key={check.name} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/45 px-3 py-3">
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{check.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{check.detail}</p></div>
                    <Badge variant={check.status === "pass" ? "success" : "warning"} className="shrink-0 rounded-full">{check.status === "pass" ? "Pass" : "Demo"}</Badge>
                  </div>
                ))}
              </div>
              <p className="border-t border-border/70 px-5 py-3 text-[11px] leading-5 text-muted-foreground">Illustrative UI only — these sample values are not a live test of example.com.</p>
            </section>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-y border-border/60 bg-surface/35">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-glow">Built for QA triage</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">The essentials in one testing workspace.</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">A responsive dashboard for exploring website quality, keeping reports organized, and understanding what the demo can actually verify.</p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-4">
              {features.map((feature) => (
                <article key={feature.title} className="group rounded-2xl border border-border/70 bg-surface/70 p-5 transition-colors hover:border-primary/35 hover:bg-surface">
                  <span className="grid size-10 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary-glow"><feature.icon className="size-5" /></span>
                  <h3 className="mt-4 text-sm font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="profiles" className="scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-glow">Choose your coverage</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Six profiles. One report format.</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Start with a quick smoke check or explore a wider set of accessibility, responsive, performance, and SEO heuristics.</p>
              </div>
              <Button variant="outline" asChild><Link to="/auth" search={{ redirect: "/tests/new" }}>Try a profile <ArrowRight className="size-4" /></Link></Button>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PROFILE_IDS.map((profile) => (
                <article key={profile} className="rounded-xl border border-border/70 bg-surface/55 p-4">
                  <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{PROFILES[profile].label}</h3><Badge variant="muted" className="rounded-full capitalize">{profile}</Badge></div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{PROFILES[profile].description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-20 border-y border-border/60 bg-surface/35">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-glow">Simple workflow</p><h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">From URL to actionable report.</h2></div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <article key={step.number} className="rounded-2xl border border-border/70 bg-background/55 p-5 sm:p-6">
                  <p className="font-mono text-sm text-primary-glow">{step.number}</p><h3 className="mt-4 text-base font-semibold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="execution" className="scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="rounded-2xl border border-warning/25 bg-warning/5 p-5 sm:p-7 lg:flex lg:items-center lg:justify-between lg:gap-8">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-sm font-semibold text-warning"><ShieldCheck className="size-4" /> Transparent demo execution</div>
                <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">Measured checks stay separate from simulated ones.</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">The lab can fetch a public page for HTTP, response-header, and HTML metadata checks. It does not launch a real browser or connect an AI reviewer in this demo, so rendering, screenshots, Core Web Vitals, and AI-generated findings are explicitly simulated.</p>
              </div>
              <Button variant="glow" className="mt-5 shrink-0 lg:mt-0" asChild><Link to="/auth" search={{ redirect: "/dashboard" }}>Explore the lab <ArrowRight className="size-4" /></Link></Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5"><Logo className="size-7" /><span className="font-medium text-foreground">SiteCheck Studio</span></Link>
          <p>Responsive QA workspace · Demo-first by design</p>
          <a href="https://github.com/abhishek-singh-devs/AI-Generated-Website-Testing-Lab" target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">View source on GitHub</a>
        </div>
      </footer>
    </div>
  );
}
