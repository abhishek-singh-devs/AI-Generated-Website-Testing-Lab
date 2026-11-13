import { describe, expect, it } from "vitest";
import { validateUrl } from "@/lib/testing/url";
import { computeScore, deriveStatus } from "@/lib/testing/engine";

describe("URL validation", () => {
  it("adds https:// to a bare domain", () => {
    const v = validateUrl("example.com");
    expect(v.ok && v.url).toBe("https://example.com/");
  });
  it("rejects localhost and private network addresses", () => {
    expect(validateUrl("http://localhost:3000").ok).toBe(false);
    expect(validateUrl("http://192.168.1.10").ok).toBe(false);
    expect(validateUrl("http://10.0.0.1").ok).toBe(false);
  });
  it("rejects non-http schemes", () => {
    expect(validateUrl("ftp://example.com").ok).toBe(false);
    expect(validateUrl("javascript:alert(1)").ok).toBe(false);
  });
  it("rejects URLs with embedded credentials", () => {
    expect(validateUrl("https://user:pass@example.com").ok).toBe(false);
  });
});

describe("Scoring rules", () => {
  it("scores 100 when every check passes", () => {
    expect(computeScore([{ status: "pass", severity: "high" }, { status: "pass", severity: "low" }])).toBe(100);
  });
  it("counts a warning as half a failure", () => {
    // two high checks (weight 12 each): one warn loses 6 of 24 → 75
    expect(computeScore([{ status: "warn", severity: "high" }, { status: "pass", severity: "high" }])).toBe(75);
  });
  it("fails a run on any critical failure, regardless of score", () => {
    const checks = [{ status: "fail" as const, severity: "critical" as const }];
    expect(deriveStatus(checks, 95)).toBe("failed");
  });
  it("fails a run scoring under 50", () => {
    expect(deriveStatus([{ status: "warn", severity: "low" }], 49)).toBe("failed");
  });
  it("passes only with no failures and score at or above the threshold", () => {
    expect(deriveStatus([{ status: "warn", severity: "low" }], 80, 80)).toBe("passed");
    expect(deriveStatus([{ status: "warn", severity: "low" }], 79, 80)).toBe("warning");
    expect(deriveStatus([{ status: "fail", severity: "low" }], 90, 80)).toBe("warning");
  });
});