import type { BrowserId, CheckCategory, DeviceId, Severity, TestProfile } from "./types";

export const PROFILES: Record<
  TestProfile,
  { label: string; description: string; categories: CheckCategory[]; estSeconds: number }
> = {
  smoke: {
    label: "Smoke",
    description: "Page loads, returns 200, core markup is intact.",
    categories: ["smoke"],
    estSeconds: 6,
  },
  accessibility: {
    label: "Accessibility",
    description: "Alt text, labels, landmarks, language and contrast heuristics.",
    categories: ["smoke", "accessibility"],
    estSeconds: 9,
  },
  responsive: {
    label: "Responsive",
    description: "Viewport meta, overflow and layout across breakpoints.",
    categories: ["smoke", "responsive"],
    estSeconds: 9,
  },
  performance: {
    label: "Performance",
    description: "Response time, payload size, compression and caching.",
    categories: ["smoke", "performance"],
    estSeconds: 10,
  },
  seo: {
    label: "SEO",
    description: "Title, description, canonical, social cards and indexability.",
    categories: ["smoke", "seo"],
    estSeconds: 8,
  },
  comprehensive: {
    label: "Comprehensive",
    description: "Every check across all five categories.",
    categories: ["smoke", "accessibility", "responsive", "performance", "seo"],
    estSeconds: 16,
  },
};

export const PROFILE_IDS = Object.keys(PROFILES) as TestProfile[];

export const BROWSERS: Record<BrowserId, { label: string; engine: string }> = {
  chromium: { label: "Chrome", engine: "Chromium 131" },
  firefox: { label: "Firefox", engine: "Gecko 133" },
  webkit: { label: "Safari", engine: "WebKit 18" },
  edge: { label: "Edge", engine: "Chromium 131" },
};
export const BROWSER_IDS = Object.keys(BROWSERS) as BrowserId[];

export const DEVICES: Record<DeviceId, { label: string; viewport: string }> = {
  desktop: { label: "Desktop", viewport: "1440 × 900" },
  laptop: { label: "Laptop", viewport: "1280 × 800" },
  tablet: { label: "Tablet", viewport: "768 × 1024" },
  mobile: { label: "Mobile", viewport: "390 × 844" },
};
export const DEVICE_IDS = Object.keys(DEVICES) as DeviceId[];

export const CATEGORY_LABELS: Record<CheckCategory, string> = {
  smoke: "Smoke",
  accessibility: "Accessibility",
  responsive: "Responsive",
  performance: "Performance",
  seo: "SEO",
};

/** Score penalty for a failing check of each severity. A "warn" costs half. */
export const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 25,
  high: 12,
  medium: 6,
  low: 2,
  info: 0,
};

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export const DEFAULT_PASS_THRESHOLD = 80;