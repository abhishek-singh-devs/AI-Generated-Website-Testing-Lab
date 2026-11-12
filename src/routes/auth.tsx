import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Radar, Sparkles } from "lucide-react";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/lab/common";

function safeRedirect(v: unknown): string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard";
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — AI Website Testing Lab" },
      { name: "description", content: "Sign in to run AI-assisted QA checks on your generated websites." },
      { property: "og:title", content: "Sign in — AI Website Testing Lab" },
      { property: "og:description", content: "Sign in to run AI-assisted QA checks on your generated websites." },
    ],
  }),
  component: AuthPage,
});

const GoogleG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

function AuthPage() {
  const { redirect } = Route.useSearch();
  const target = safeRedirect(redirect);
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: target, replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: target, replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, target]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("We sent a password reset link to your inbox.");
      } else if (mode === "signup") {
        if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${target}` },
        });
        if (error) throw error;
        if (!data.session) setSent("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "lovable") => {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth?redirect=" + encodeURIComponent(target) });
    if (result.error) toast.error(result.error.message ?? "Sign-in failed");
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-grid opacity-70" aria-hidden />
        <div className="absolute inset-0 bg-glow" aria-hidden />
        <Link to="/" className="relative flex items-center gap-2.5">
          <Logo />
          <span className="font-semibold">AI Website Testing Lab</span>
        </Link>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Ship generated sites <span className="text-gradient">without the surprises.</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Paste a URL, pick a profile, and get a scored QA report with prioritized fixes in seconds.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            {[
              { icon: Radar, text: "Live HTTP, HTML and header checks" },
              { icon: ShieldCheck, text: "Accessibility, SEO, responsive and performance profiles" },
              { icon: Sparkles, text: "AI-style summaries and suggested fixes" },
            ].map(({ icon: I, text }) => (
              <li key={text} className="flex items-center gap-3 text-muted-foreground">
                <span className="grid size-8 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary-glow">
                  <I className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-muted-foreground">Demo build · browser rendering and AI review are simulated.</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Logo />
            <span className="font-semibold">Testing Lab</span>
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Create your account" : "Reset your password"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Welcome back. Your test history is waiting."
              : mode === "signup"
                ? "Free demo workspace with sample runs included."
                : "We'll email you a secure reset link."}
          </p>

          {sent ? (
            <div className="mt-8 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
              {sent}
              <button className="mt-3 block text-foreground underline underline-offset-4" onClick={() => { setSent(null); setMode("signin"); }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {mode !== "forgot" && (
                <div className="mt-8 grid gap-2.5">
                  <Button type="button" variant="outline" className="h-10 gap-2.5 border-[#8E918F] bg-[#131314] font-medium text-[#E3E3E3] hover:bg-[#131314] hover:text-[#E3E3E3] hover:brightness-125" onClick={() => oauth("google")}>
                    <GoogleG /> Continue with Google
                  </Button>
                  <button type="button" className="lovable-auth-button" onClick={() => oauth("lovable")}>
                    Continue with Lovable
                  </button>
                  <div className="my-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
                  </div>
                </div>
              )}
              <form onSubmit={submit} className={mode === "forgot" ? "mt-8 grid gap-4" : "grid gap-4"}>
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-10" />
                </div>
                {mode !== "forgot" && (
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setMode("forgot")}>
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "signup" ? 8 : undefined} className="h-10" />
                  </div>
                )}
                <Button type="submit" variant="glow" className="h-10" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signin" ? (
                  <>New here? <button className="font-medium text-foreground hover:underline" onClick={() => setMode("signup")}>Create an account</button></>
                ) : (
                  <>Already have an account? <button className="font-medium text-foreground hover:underline" onClick={() => setMode("signin")}>Sign in</button></>
                )}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}