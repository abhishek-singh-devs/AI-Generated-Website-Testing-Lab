import { describe, expect, it } from "vitest";
import { filterRuns } from "@/lib/history-filter";
import type { TestRunRow } from "@/lib/testing/types";

const NOW = Date.parse("2026-11-13T12:00:00Z");
const run = (p: Partial<TestRunRow>): TestRunRow => ({
  id: p.id ?? "x", user_id: null, suite_id: null, url: "https://example.com/", profile: "smoke",
  browser: "chromium", device: "desktop", instructions: null, status: "passed", score: 90,
  duration_ms: 1000, checks: [], summary: null, issues_count: 0, critical_count: 0, mode: "simulated",
  is_sample: false, created_at: new Date(NOW).toISOString(), completed_at: null, ...p,
});

const runs = [
  run({ id: "a", url: "https://shop.example.com/checkout", status: "failed", profile: "seo" }),
  run({ id: "b", url: "https://blog.test.dev/", status: "passed", is_sample: true, created_at: new Date(NOW - 3 * 864e5).toISOString() }),
  run({ id: "c", url: "https://docs.test.dev/", status: "warning", summary: "Checkout button overflow", created_at: new Date(NOW - 40 * 864e5).toISOString() }),
  run({ id: "d", url: "https://docs.example.com/", instructions: "Verify the payment flow" }),
];
const ids = (r: TestRunRow[]) => r.map((x) => x.id);

describe("History filters", () => {
  it("searches URL and summary text, case-insensitively", () => {
    expect(ids(filterRuns(runs, { q: "TEST.DEV" }, NOW))).toEqual(["b", "c"]);
    expect(ids(filterRuns(runs, { q: "checkout" }, NOW))).toEqual(["a", "c"]);
  });
  it("filters by status", () => {
    expect(ids(filterRuns(runs, { status: "failed" }, NOW))).toEqual(["a"]);
    expect(ids(filterRuns(runs, { status: "all" }, NOW))).toEqual(["a", "b", "c", "d"]);
  });
  it("filters by profile", () => {
    expect(ids(filterRuns(runs, { profile: "seo" }, NOW))).toEqual(["a"]);
  });
  it("limits to the last 7 days", () => {
    expect(ids(filterRuns(runs, { range: "7d" }, NOW))).toEqual(["a", "b", "d"]);
    expect(ids(filterRuns(runs, { range: "7d", source: "sample" }, NOW))).toEqual(["b"]);
    expect(ids(filterRuns(runs, { range: "24h" }, NOW))).toEqual(["a", "d"]);
  });
  it("separates my runs from sample runs", () => {
    expect(ids(filterRuns(runs, { source: "mine" }, NOW))).toEqual(["a", "c", "d"]);
    expect(ids(filterRuns(runs, { source: "sample" }, NOW))).toEqual(["b"]);
  });
  it("combines status, profile, and source filters", () => {
    expect(ids(filterRuns(runs, { status: "failed", profile: "seo", source: "mine" }, NOW))).toEqual(["a"]);
  });
});