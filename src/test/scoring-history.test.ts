import { describe, expect, it } from "vitest";
import { computeScore, deriveStatus, generateRun } from "@/lib/testing/engine";
import { filterRuns } from "@/routes/_authenticated/history";
import type { TestRunRow } from "@/lib/testing/types";

const now = Date.UTC(2026, 10, 13, 0, 0, 0);
const day = 24 * 60 * 60 * 1000;

function makeRun(id: string, overrides: Partial<TestRunRow> = {}): TestRunRow {
  return {
    id,
    user_id: "user-1",
    suite_id: null,
    url: "https://example.com",
    profile: "smoke",
    browser: "chromium",
    device: "desktop",
    instructions: null,
    status: "passed",
    score: 96,
    duration_ms: 1200,
    checks: [],
    summary: "All checks passed",
    issues_count: 0,
    critical_count: 0,
    mode: "simulated",
    is_sample: false,
    created_at: new Date(now - 2 * day).toISOString(),
    completed_at: null,
    ...overrides,
  };
}

describe("weighted scoring and run outcomes", () => {
  it("weights warnings at half severity and ignores skipped checks", () => {
    expect(
      computeScore([
        { status: "pass", severity: "critical" },
        { status: "warn", severity: "low" },
        { status: "skip", severity: "high" },
      ]),
    ).toBe(96);
  });

  it("derives pass, warning, and fail outcomes at the configured threshold", () => {
    expect(deriveStatus([{ status: "pass", severity: "medium" }], 80)).toBe("passed");
    expect(deriveStatus([{ status: "fail", severity: "medium" }], 75)).toBe("warning");
    expect(deriveStatus([{ status: "fail", severity: "critical" }], 92)).toBe("failed");
    expect(deriveStatus([{ status: "pass", severity: "low" }], 49)).toBe("failed");
  });

  it("produces deterministic, explicitly simulated results for the same seed", () => {
    const input = {
      url: "https://example.com",
      profile: "comprehensive" as const,
      browser: "chromium" as const,
      device: "desktop" as const,
      seed: "repeatable-demo-seed",
    };
    const first = generateRun(input);
    const second = generateRun(input);

    expect(first).toEqual(second);
    expect(first.mode).toBe("simulated");
    expect(first.checks.length).toBeGreaterThan(0);
    expect(first.checks.every((check) => check.source === "simulated")).toBe(true);
    expect(first.score).toBeGreaterThanOrEqual(0);
    expect(first.score).toBeLessThanOrEqual(100);
  });

  it("marks an unreachable page as a measured critical failure", () => {
    const outcome = generateRun({
      url: "https://example.com",
      profile: "smoke",
      browser: "chromium",
      device: "desktop",
      seed: "unreachable-demo",
      probe: { reachable: false, error: "Timed out" },
    });

    expect(outcome.status).toBe("failed");
    expect(outcome.mode).toBe("hybrid");
    expect(outcome.checks.find((check) => check.id === "smoke.reachable")).toMatchObject({
      status: "fail",
      severity: "critical",
      source: "measured",
    });
    expect(outcome.checks.some((check) => check.status === "skip")).toBe(true);
  });
});

describe("test history filters", () => {
  it("searches case-insensitively across URL, instructions, and summary", () => {
    const runs = [
      makeRun("url-match", { url: "https://shop.example.com/checkout" }),
      makeRun("instruction-match", { instructions: "Verify the payment flow" }),
      makeRun("summary-match", { summary: "Checkout form needs attention" }),
      makeRun("no-match", { url: "https://docs.example.com" }),
    ];

    expect(filterRuns(runs, { q: "CHECKOUT" }, now).map((run) => run.id)).toEqual(["url-match", "summary-match"]);
    expect(filterRuns(runs, { q: "PAYMENT" }, now).map((run) => run.id)).toEqual(["instruction-match"]);
  });

  it("combines status, profile, and personal/sample source filters", () => {
    const runs = [
      makeRun("personal-failed", { status: "failed", profile: "smoke" }),
      makeRun("personal-warning", { status: "warning", profile: "smoke" }),
      makeRun("personal-seo", { status: "failed", profile: "seo" }),
      makeRun("sample-failed", { status: "failed", profile: "smoke", is_sample: true, user_id: null }),
    ];

    expect(filterRuns(runs, { status: "failed", profile: "smoke", source: "mine" }, now).map((run) => run.id)).toEqual(["personal-failed"]);
    expect(filterRuns(runs, { status: "failed", profile: "smoke", source: "sample" }, now).map((run) => run.id)).toEqual(["sample-failed"]);
  });

  it("applies date ranges relative to the supplied clock", () => {
    const runs = [
      makeRun("recent", { created_at: new Date(now - 2 * day).toISOString() }),
      makeRun("old", { created_at: new Date(now - 10 * day).toISOString() }),
      makeRun("recent-sample", { created_at: new Date(now - day).toISOString(), is_sample: true, user_id: null }),
    ];

    expect(filterRuns(runs, { range: "7d", source: "sample" }, now).map((run) => run.id)).toEqual(["recent-sample"]);
    expect(filterRuns(runs, { range: "24h" }, now).map((run) => run.id)).toEqual(["recent-sample"]);
  });
});
