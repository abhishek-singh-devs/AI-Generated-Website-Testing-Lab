import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { probeSite } from "@/lib/probe.functions";
import { generateRun, runSteps } from "@/lib/testing/engine";
import { PROFILES } from "@/lib/testing/constants";
import type { BrowserId, DeviceId, ProbeResult, RunOutcome, TestProfile } from "@/lib/testing/types";

export interface RunConfig {
  url: string;
  profile: TestProfile;
  browser: BrowserId;
  device: DeviceId;
  instructions: string | null;
  suiteId: string | null;
  liveProbe: boolean;
  passThreshold: number;
}

export interface LogLine {
  id: number;
  at: number;
  level: "info" | "ok" | "warn" | "fail" | "muted";
  text: string;
}

export interface RunnerState {
  phase: "idle" | "running" | "done" | "cancelled" | "error";
  steps: string[];
  stepIndex: number;
  progress: number;
  logs: LogLine[];
  outcome?: RunOutcome | undefined;
  probe?: ProbeResult | undefined;
  startedAt?: number | undefined;
  error?: string | undefined;
}

const initial: RunnerState = { phase: "idle", steps: [], stepIndex: 0, progress: 0, logs: [] };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Drives a realistic, step-by-step test run. Resolves with the outcome once all steps finish. */
export function useTestRunner() {
  const [state, setState] = useState<RunnerState>(initial);
  const cancelled = useRef(false);
  const mounted = useRef(true);
  const logId = useRef(0);
  const probeFn = useServerFn(probeSite);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelled.current = true;
    };
  }, []);

  const log = useCallback((level: LogLine["level"], text: string) => {
    if (!mounted.current) return;
    setState((s) => ({ ...s, logs: [...s.logs, { id: ++logId.current, at: Date.now(), level, text }] }));
  }, []);

  const reset = useCallback(() => {
    cancelled.current = true;
    setState(initial);
  }, []);

  const cancel = useCallback(() => {
    cancelled.current = true;
    setState((s) => (s.phase === "running" ? { ...s, phase: "cancelled" } : s));
  }, []);

  const start = useCallback(
    async (cfg: RunConfig): Promise<{ outcome: RunOutcome; startedAt: number } | null> => {
      cancelled.current = false;
      const steps = runSteps(cfg.profile, cfg.browser, cfg.device);
      const startedAt = Date.now();
      setState({ phase: "running", steps, stepIndex: 0, progress: 0, logs: [], startedAt });

      // Start the live probe immediately; it runs while the first steps animate.
      const probePromise: Promise<ProbeResult | undefined> = cfg.liveProbe
        ? probeFn({ data: { url: cfg.url } }).catch(() => undefined)
        : Promise.resolve(undefined);

      const totalMs = PROFILES[cfg.profile].estSeconds * 650;
      const perStep = totalMs / steps.length;
      let outcome: RunOutcome | undefined;
      let probe: ProbeResult | undefined;

      const advance = async (i: number, ms: number) => {
        const t0 = Date.now();
        while (Date.now() - t0 < ms) {
          if (cancelled.current) return false;
          const frac = Math.min(1, (Date.now() - t0) / ms);
          if (mounted.current)
            setState((s) => ({ ...s, stepIndex: i, progress: Math.min(99, ((i + frac) / steps.length) * 100) }));
          await sleep(90);
        }
        return !cancelled.current;
      };

      try {
        for (let i = 0; i < steps.length; i++) {
          if (cancelled.current) return null;
          log("info", steps[i] ?? "");

          if (i === 0) {
            log("muted", `Profile: ${PROFILES[cfg.profile].label} · target ${cfg.url}`);
            if (!(await advance(i, perStep))) return null;
            continue;
          }

          if (i === 1) {
            const [p] = await Promise.all([probePromise, advance(i, perStep)]);
            if (cancelled.current) return null;
            probe = p;
            if (!cfg.liveProbe) log("muted", "Live probe disabled in settings — all checks simulated.");
            else if (!p) log("warn", "Live probe unavailable — falling back to simulated results.");
            else if (!p.reachable) log("fail", `Page unreachable: ${p.error}`);
            else
              log(
                p.status && p.status < 400 ? "ok" : "fail",
                `HTTP ${p.status} · ${p.responseMs} ms · ${Math.round((p.bytes ?? 0) / 1024)} KB${p.finalUrl && p.finalUrl !== cfg.url ? ` → ${p.finalUrl}` : ""}`,
              );
            outcome = generateRun({
              url: cfg.url,
              profile: cfg.profile,
              browser: cfg.browser,
              device: cfg.device,
              instructions: cfg.instructions,
              probe,
              passThreshold: cfg.passThreshold,
            });
            if (mounted.current) setState((s) => ({ ...s, probe }));
            continue;
          }

          if (i === steps.length - 1) {
            if (!(await advance(i, perStep))) return null;
            log("muted", "Ranking issues by severity and drafting suggestions…");
            continue;
          }

          // Category step: stream that category's check results into the log.
          const category = PROFILES[cfg.profile].categories[i - 2];
          const catChecks = outcome!.checks.filter((c) => c.category === category);
          const slice = perStep / Math.max(1, catChecks.length);
          for (const c of catChecks) {
            if (!(await advance(i, slice))) return null;
            const level = c.status === "pass" ? "ok" : c.status === "warn" ? "warn" : c.status === "fail" ? "fail" : "muted";
            const tag = c.source === "measured" ? "" : " (sim)";
            log(level, `${c.name}${tag} — ${c.message}`);
          }
        }

        if (!outcome) throw new Error("Run produced no results");
        if (mounted.current) setState((s) => ({ ...s, progress: 100, phase: "done", outcome }));
        log(
          outcome.status === "passed" ? "ok" : outcome.status === "warning" ? "warn" : "fail",
          `Run complete — score ${outcome.score}/100 · ${outcome.status.toUpperCase()}`,
        );
        return { outcome, startedAt };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        if (mounted.current) setState((s) => ({ ...s, phase: "error", error: msg }));
        return null;
      }
    },
    [log, probeFn],
  );

  return { state, start, cancel, reset };
}