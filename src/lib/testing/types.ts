export type TestProfile =
  | "smoke"
  | "accessibility"
  | "responsive"
  | "performance"
  | "seo"
  | "comprehensive";

export type CheckCategory = "smoke" | "accessibility" | "responsive" | "performance" | "seo";

export type BrowserId = "chromium" | "firefox" | "webkit" | "edge";
export type DeviceId = "desktop" | "laptop" | "tablet" | "mobile";

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type CheckStatus = "pass" | "fail" | "warn" | "skip";
export type RunStatus = "running" | "passed" | "warning" | "failed" | "error";

/** "measured" = derived from a real HTTP fetch of the page; "simulated" = synthetic demo output. */
export type CheckSource = "measured" | "simulated";

export interface CheckResult {
  id: string;
  name: string;
  category: CheckCategory;
  status: CheckStatus;
  severity: Severity;
  message: string;
  suggestion?: string | undefined;
  source: CheckSource;
  durationMs: number;
}

/** Facts gathered by the server-side page probe. All optional: a probe can partially fail. */
export interface ProbeResult {
  reachable: boolean;
  error?: string | undefined;
  finalUrl?: string | undefined;
  status?: number | undefined;
  responseMs?: number | undefined;
  bytes?: number | undefined;
  https?: boolean | undefined;
  contentType?: string | undefined;
  compressed?: boolean | undefined;
  headers?: {
    hsts: boolean;
    csp: boolean;
    xFrameOptions: boolean;
    cacheControl?: string | undefined;
  } | undefined;
  html?: HtmlFacts | undefined;
}

export interface HtmlFacts {
    title?: string | undefined;
    metaDescription?: string | undefined;
    hasViewport: boolean;
    viewportContent?: string | undefined;
    lang?: string | undefined;
    h1Count: number;
    imgCount: number;
    imgMissingAlt: number;
    canonical?: string | undefined;
    ogTitle: boolean;
    ogImage: boolean;
    noindex: boolean;
    linkCount: number;
    scriptCount: number;
    stylesheetCount: number;
    hasFavicon: boolean;
    hasCharset: boolean;
    inputsWithoutLabel: number;
    emptyButtons: number;
    fixedWidthElements: number;
}

export interface RunOutcome {
  status: Exclude<RunStatus, "running">;
  score: number;
  checks: CheckResult[];
  summary: string;
  durationMs: number;
  issuesCount: number;
  criticalCount: number;
  mode: "simulated" | "hybrid";
}

export interface TestRunRow {
  id: string;
  user_id: string | null;
  suite_id: string | null;
  url: string;
  profile: TestProfile;
  browser: BrowserId;
  device: DeviceId;
  instructions: string | null;
  status: RunStatus;
  score: number | null;
  duration_ms: number | null;
  checks: CheckResult[];
  summary: string | null;
  issues_count: number;
  critical_count: number;
  mode: string;
  is_sample: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface TestSuiteRow {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  target_url: string;
  profile: TestProfile;
  browsers: BrowserId[];
  devices: DeviceId[];
  schedule: "manual" | "daily" | "weekly";
  enabled: boolean;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsRow {
  user_id: string;
  display_name: string | null;
  default_profile: TestProfile;
  default_browser: BrowserId;
  default_device: DeviceId;
  pass_threshold: number;
  notify_on_failure: boolean;
  live_probe: boolean;
  weekly_digest: boolean;
  updated_at: string;
}