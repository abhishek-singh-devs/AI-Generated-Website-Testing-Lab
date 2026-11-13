import { describe, expect, it } from "vitest";
import { computeScore, deriveStatus, generateRun } from "@/lib/testing/engine";

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
