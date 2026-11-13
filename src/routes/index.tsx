import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Radar,
  Accessibility,
  Smartphone,
  Gauge,
  Search,
  ShieldCheck,
  Layers,
  History,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/lab/common";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "AI-Generated Website Testing Lab — QA checks for generated sites";
const DESC =
  "Paste a URL and run smoke, accessibility, responsive, performance and SEO checks on AI-generated websites. Scored reports, prioritized fixes and run history.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function useSignedIn() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}

const PROFILES = [
  { icon: Radar, name: "Smoke", text: "Loads, returns 200, core markup intact." },
  { icon: Accessibility, name: "Accessibility", text: "Alt text, labels, landmarks, language." },
  { icon: Smartphone, name: "Responsive", text: "Viewport meta, overflow, breakpoints." },
  { icon: Gauge, name: "Performance", text: "Response time, payload, compression, caching." },
  { icon: Search, name: "SEO", text: "Title, description, canonical, social cards." },
  { icon: ShieldCheck, name: "Comprehensive", text: "All 32 checks across every category." },
];

function Landing() {
  const signedIn = useSignedIn();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-semibold">Testing Lab</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {signedIn ? (
              <Button asChild variant="glow" size="sm">
                <Link to="/dashboard">Open dashboard <ArrowRight /></Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth" search={{ redirect: undefined }}>Sign in</Link>
                </Button>
                <Button asChild variant="glow" size="sm">
                  <Link to="/auth" search={{ redirect: undefined }}>Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
          <div className="absolute inset-0 bg-glow" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-glow">
                <FlaskConical className="size-3.5" /> QA for AI-built websites
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Test what the AI built <span className="text-gradient">before your users do.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Paste a URL, choose a test profile and get a scored report with failing checks, severity and suggested fixes — saved to your history.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="glow" size="lg">
                  {signedIn ? (
                    <Link to="/tests/new">Run a test <ArrowRight /></Link>
                  ) : (
                    <Link to="/auth" search={{ redirect: "/tests/new" }}>Run your first test <ArrowRight /></Link>
                  )}
                </Button>
                <Button asChild variant="outline" size="lg">
                  {signedIn ? <Link to="/history">View history</Link> : <Link to="/auth" search={{ redirect: "/dashboard" }}>See sample runs</Link>}
                </Button>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Demo build: HTTP, HTML and header checks fetch the real page. Browser rendering and AI review are simulated.
              </p>
            </div>

            <ReportPreview />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Six profiles, one report</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">Pick the depth you need. Every run is scored out of 100 and graded passed, warning or failed.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROFILES.map(({ icon: I, name, text }) => (
              <div key={name} className="surface-panel p-5 transition-colors hover:border-primary/40">
                <span className="grid size-10 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary-glow">
                  <I className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border/60 bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-3">
            {[
              { icon: Layers, title: "Reusable suites", text: "Save a site with its profile, browsers and devices. Re-run in one click after every regeneration." },
              { icon: History, title: "Searchable history", text: "Filter runs by status, profile or URL, compare scores over time and export to CSV." },
              { icon: ShieldCheck, title: "Honest labels", text: "Every check says whether it was measured from the live page or simulated for the demo." },
            ].map(({ icon: I, title, text }) => (
              <div key={title}>
                <I className="size-6 text-primary-glow" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready to check your next generated site?</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">Free demo workspace with sample runs and suites included.</p>
          <Button asChild variant="glow" size="lg" className="mt-8">
            {signedIn ? <Link to="/dashboard">Open dashboard <ArrowRight /></Link> : <Link to="/auth" search={{ redirect: undefined }}>Create a free account <ArrowRight /></Link>}
          </Button>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2"><Logo className="size-6" /> AI-Generated Website Testing Lab</div>
          <span>Test execution in this demo is partly simulated.</span>
        </div>
      </footer>
    </div>
  );
}

function ReportPreview() {
  const rows = [
    { icon: CheckCircle2, tone: "text-success", name: "Page returns 200", tag: "Measured" },
    { icon: CheckCircle2, tone: "text-success", name: "Viewport meta present", tag: "Measured" },
    { icon: AlertTriangle, tone: "text-warning", name: "3 images missing alt text", tag: "Measured" },
    { icon: XCircle, tone: "text-destructive", name: "Horizontal overflow at 390px", tag: "Simulated" },
    { icon: CheckCircle2, tone: "text-success", name: "Canonical URL set", tag: "Measured" },
  ];
  return (
    <div className="surface-panel relative p-5 shadow-glow animate-fade-up">
      <div className="flex items-center justify-between border-b border-border/70 pb-4">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm">launch-page.example.app</p>
          <p className="text-xs text-muted-foreground">Comprehensive · Chrome · Mobile</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl font-semibold text-warning">78</p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Warning</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1">
        {rows.map(({ icon: I, tone, name, tag }) => (
          <li key={name} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-surface-raised">
            <I className={`size-4 shrink-0 ${tone}`} />
            <span className="flex-1 truncate">{name}</span>
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-lg border border-primary/25 bg-primary/8 p-3 text-xs text-muted-foreground">
        <span className="font-medium text-primary-glow">Suggested fix:</span> constrain the hero image with <code className="font-mono">max-width: 100%</code> to remove overflow on small screens.
      </div>
    </div>
  );
}