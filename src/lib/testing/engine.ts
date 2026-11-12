import { PROFILES, SEVERITY_PENALTY, DEFAULT_PASS_THRESHOLD, BROWSERS, DEVICES, CATEGORY_LABELS } from "./constants";
import type {
  BrowserId,
  CheckCategory,
  CheckResult,
  CheckStatus,
  DeviceId,
  ProbeResult,
  RunOutcome,
  Severity,
  TestProfile,
} from "./types";

/* ---------- deterministic randomness ---------- */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- check catalogue ---------- */
interface Ctx {
  probe?: ProbeResult | undefined;
  rng: () => number;
  device: DeviceId;
  browser: BrowserId;
}
type Verdict = { status: CheckStatus; message: string; suggestion?: string | undefined; measured: boolean };
interface CheckDef {
  id: string;
  name: string | ((c: Ctx) => string);
  category: CheckCategory;
  severity: Severity;
  /** Simulated failure / warning probabilities. */
  sim: { fail: number; warn: number; pass: string; failMsg: string; warnMsg?: string | undefined; suggestion: string };
  measure?: (c: Ctx) => Omit<Verdict, "measured"> | null;
}

const html = (c: Ctx) => (c.probe?.reachable ? c.probe.html : undefined);
const fmtKb = (b: number) => `${Math.round(b / 1024)} KB`;

const CHECKS: CheckDef[] = [
  // --- smoke
  {
    id: "smoke.reachable",
    name: "Page responds successfully",
    category: "smoke",
    severity: "critical",
    sim: { fail: 0.04, warn: 0, pass: "Returned HTTP 200 in a healthy time.", failMsg: "Page returned HTTP 500.", suggestion: "Check server logs and the deploy for runtime errors." },
    measure: (c) => {
      const p = c.probe;
      if (!p) return null;
      if (!p.reachable) return { status: "fail", message: `Page could not be reached: ${p.error ?? "unknown error"}.`, suggestion: "Confirm the site is deployed and publicly accessible." };
      const s = p.status ?? 0;
      if (s >= 200 && s < 400) return { status: "pass", message: `Returned HTTP ${s}.` };
      return { status: "fail", message: `Returned HTTP ${s}.`, suggestion: "Fix the server response so the page returns 200 OK." };
    },
  },
  {
    id: "smoke.https",
    name: "Served over HTTPS",
    category: "smoke",
    severity: "high",
    sim: { fail: 0.03, warn: 0, pass: "Connection is encrypted with TLS.", failMsg: "Page is served over plain HTTP.", suggestion: "Redirect all traffic to HTTPS and enable HSTS." },
    measure: (c) => (c.probe?.reachable ? (c.probe.https ? { status: "pass", message: "Final URL uses HTTPS." } : { status: "fail", message: "Final URL is plain HTTP.", suggestion: "Redirect all traffic to HTTPS and enable HSTS." }) : null),
  },
  {
    id: "smoke.title",
    name: "Document has a title",
    category: "smoke",
    severity: "medium",
    sim: { fail: 0.06, warn: 0, pass: "A <title> element is present.", failMsg: "No <title> element found.", suggestion: "Add a descriptive <title> in the document head." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      return h.title ? { status: "pass", message: `Title: “${h.title.slice(0, 70)}”` } : { status: "fail", message: "No <title> element found.", suggestion: "Add a descriptive <title> in the document head." };
    },
  },
  {
    id: "smoke.charset",
    name: "Character encoding declared",
    category: "smoke",
    severity: "low",
    sim: { fail: 0.05, warn: 0, pass: "UTF-8 charset declared.", failMsg: "No charset declaration found.", suggestion: "Add <meta charset=\"utf-8\"> as the first element in <head>." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      return h.hasCharset || /charset=/i.test(c.probe?.contentType ?? "") ? { status: "pass", message: "Character encoding is declared." } : { status: "fail", message: "No charset declaration found.", suggestion: "Add <meta charset=\"utf-8\"> as the first element in <head>." };
    },
  },
  {
    id: "smoke.favicon",
    name: "Favicon present",
    category: "smoke",
    severity: "low",
    sim: { fail: 0.12, warn: 0, pass: "Favicon link found.", failMsg: "No favicon declared.", suggestion: "Add a <link rel=\"icon\"> pointing to your favicon." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      return h.hasFavicon ? { status: "pass", message: "Favicon link found." } : { status: "warn", message: "No <link rel=\"icon\"> found; browsers will fall back to /favicon.ico.", suggestion: "Declare a favicon explicitly in the document head." };
    },
  },
  {
    id: "smoke.headers",
    name: "Security headers",
    category: "smoke",
    severity: "low",
    sim: { fail: 0, warn: 0.35, pass: "HSTS, CSP and frame protections are set.", failMsg: "", warnMsg: "Content-Security-Policy header is missing.", suggestion: "Add Strict-Transport-Security, Content-Security-Policy and X-Frame-Options headers." },
    measure: (c) => {
      const hd = c.probe?.reachable ? c.probe.headers : undefined;
      if (!hd) return null;
      const missing = [!hd.hsts && "HSTS", !hd.csp && "CSP", !hd.xFrameOptions && "X-Frame-Options"].filter(Boolean);
      return missing.length === 0 ? { status: "pass", message: "HSTS, CSP and frame protections are set." } : { status: "warn", message: `Missing: ${missing.join(", ")}.`, suggestion: "Add the missing security headers at your host or CDN." };
    },
  },
  {
    id: "smoke.console",
    name: "No console errors on load",
    category: "smoke",
    severity: "medium",
    sim: { fail: 0.18, warn: 0.12, pass: "No errors logged during page load.", failMsg: "2 uncaught errors: “Cannot read properties of undefined (reading 'map')”.", warnMsg: "1 deprecation warning logged.", suggestion: "Guard against undefined data before rendering lists, and fix hydration warnings." },
  },
  {
    id: "smoke.links",
    name: "No broken internal links",
    category: "smoke",
    severity: "high",
    sim: { fail: 0.15, warn: 0.1, pass: "All crawled internal links resolved.", failMsg: "3 internal links return 404 (e.g. /pricing, /about-us).", warnMsg: "1 link redirects more than twice.", suggestion: "Generated sites often link to pages that were never created — add the routes or remove the links." },
  },
  // --- accessibility
  {
    id: "a11y.lang",
    name: "Page language declared",
    category: "accessibility",
    severity: "medium",
    sim: { fail: 0.1, warn: 0, pass: "<html lang> is set.", failMsg: "<html> has no lang attribute.", suggestion: "Add lang=\"en\" (or the correct language) to the <html> element." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      return h.lang ? { status: "pass", message: `Language set to “${h.lang}”.` } : { status: "fail", message: "<html> has no lang attribute.", suggestion: "Add lang=\"en\" (or the correct language) to the <html> element." };
    },
  },
  {
    id: "a11y.alt",
    name: "Images have alt text",
    category: "accessibility",
    severity: "high",
    sim: { fail: 0.3, warn: 0, pass: "Every image has an alt attribute.", failMsg: "4 of 11 images are missing alt text.", suggestion: "Describe meaningful images with alt text; use alt=\"\" for decorative ones." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      if (h.imgCount === 0) return { status: "pass", message: "No <img> elements in the initial HTML." };
      return h.imgMissingAlt === 0 ? { status: "pass", message: `All ${h.imgCount} images have alt attributes.` } : { status: "fail", message: `${h.imgMissingAlt} of ${h.imgCount} images are missing alt text.`, suggestion: "Describe meaningful images with alt text; use alt=\"\" for decorative ones." };
    },
  },
  {
    id: "a11y.labels",
    name: "Form inputs are labelled",
    category: "accessibility",
    severity: "high",
    sim: { fail: 0.22, warn: 0, pass: "All inputs have an associated label.", failMsg: "2 inputs rely on placeholder text only.", suggestion: "Pair every input with a <label> or aria-label; placeholders are not labels." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      return h.inputsWithoutLabel === 0 ? { status: "pass", message: "No unlabelled inputs found." } : { status: "fail", message: `${h.inputsWithoutLabel} input(s) have no label or aria-label.`, suggestion: "Pair every input with a <label> or aria-label; placeholders are not labels." };
    },
  },
  {
    id: "a11y.buttons",
    name: "Buttons have accessible names",
    category: "accessibility",
    severity: "medium",
    sim: { fail: 0.2, warn: 0, pass: "Every button has a text or aria name.", failMsg: "3 icon-only buttons have no accessible name.", suggestion: "Add aria-label to icon-only buttons (menus, close, social icons)." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      return h.emptyButtons === 0 ? { status: "pass", message: "Every button has a text or aria name." } : { status: "fail", message: `${h.emptyButtons} button(s) have no accessible name.`, suggestion: "Add aria-label to icon-only buttons (menus, close, social icons)." };
    },
  },
  {
    id: "a11y.h1",
    name: "Single top-level heading",
    category: "accessibility",
    severity: "low",
    sim: { fail: 0.05, warn: 0.2, pass: "Exactly one <h1> found.", failMsg: "No <h1> on the page.", warnMsg: "3 <h1> elements found.", suggestion: "Use one <h1> for the page topic and nest h2–h6 beneath it." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      if (h.h1Count === 1) return { status: "pass", message: "Exactly one <h1> found." };
      if (h.h1Count === 0) return { status: "fail", message: "No <h1> in the initial HTML (may be rendered client-side).", suggestion: "Use one <h1> for the page topic; server-render it if possible." };
      return { status: "warn", message: `${h.h1Count} <h1> elements found.`, suggestion: "Use one <h1> for the page topic and nest h2–h6 beneath it." };
    },
  },
  {
    id: "a11y.contrast",
    name: "Text contrast meets WCAG AA",
    category: "accessibility",
    severity: "high",
    sim: { fail: 0.28, warn: 0.15, pass: "All sampled text meets 4.5:1.", failMsg: "Muted gray text on hero gradient measures 2.9:1.", warnMsg: "Placeholder text measures 3.8:1.", suggestion: "Darken secondary text or lighten its background until contrast reaches 4.5:1." },
  },
  {
    id: "a11y.focus",
    name: "Visible keyboard focus",
    category: "accessibility",
    severity: "medium",
    sim: { fail: 0.16, warn: 0.1, pass: "Focus ring visible on all interactive elements.", failMsg: "outline: none removes focus on nav links.", warnMsg: "Focus ring is low-contrast on dark sections.", suggestion: "Use :focus-visible with a clearly visible ring instead of removing outlines." },
  },
  // --- responsive
  {
    id: "resp.viewport",
    name: "Viewport meta tag",
    category: "responsive",
    severity: "critical",
    sim: { fail: 0.04, warn: 0, pass: "width=device-width, initial-scale=1", failMsg: "No viewport meta tag; mobile renders at 980px.", suggestion: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      return h.hasViewport ? { status: "pass", message: h.viewportContent ?? "Viewport meta present." } : { status: "fail", message: "No viewport meta tag; mobile browsers will render at desktop width.", suggestion: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">." };
    },
  },
  {
    id: "resp.zoom",
    name: "Pinch-zoom allowed",
    category: "responsive",
    severity: "medium",
    sim: { fail: 0, warn: 0.1, pass: "Users can zoom the page.", failMsg: "", warnMsg: "maximum-scale=1 blocks zoom.", suggestion: "Remove user-scalable=no and maximum-scale from the viewport tag." },
    measure: (c) => {
      const h = html(c);
      if (!h || !h.hasViewport) return null;
      const v = (h.viewportContent ?? "").toLowerCase();
      return /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(v) ? { status: "warn", message: "Viewport blocks pinch-zoom.", suggestion: "Remove user-scalable=no and maximum-scale from the viewport tag." } : { status: "pass", message: "Users can zoom the page." };
    },
  },
  {
    id: "resp.overflow",
    name: (c) => `No horizontal overflow (${DEVICES[c.device].viewport})`,
    category: "responsive",
    severity: "high",
    sim: { fail: 0.22, warn: 0.1, pass: "Content fits the viewport width.", failMsg: "Pricing table overflows by 212px.", warnMsg: "Hero image overflows by 8px.", suggestion: "Use max-width: 100% on media and let wide tables scroll inside their own container." },
  },
  {
    id: "resp.tap",
    name: "Tap targets at least 44px",
    category: "responsive",
    severity: "medium",
    sim: { fail: 0.2, warn: 0.2, pass: "Interactive elements are comfortably sized.", failMsg: "Footer links are 18px tall and 4px apart.", warnMsg: "Social icons are 36px.", suggestion: "Give links and icon buttons at least 44×44px of hit area with spacing." },
  },
  {
    id: "resp.fixed",
    name: "Fluid layout widths",
    category: "responsive",
    severity: "medium",
    sim: { fail: 0, warn: 0.15, pass: "No hard-coded pixel widths detected.", failMsg: "", warnMsg: "4 elements use fixed widths over 600px.", suggestion: "Replace fixed pixel widths with max-width and percentage or grid layouts." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      return h.fixedWidthElements > 3 ? { status: "warn", message: `${h.fixedWidthElements} inline styles set fixed widths over 600px.`, suggestion: "Replace fixed pixel widths with max-width and percentage or grid layouts." } : { status: "pass", message: "No large hard-coded widths in the HTML." };
    },
  },
  // --- performance
  {
    id: "perf.ttfb",
    name: "Server response time",
    category: "performance",
    severity: "high",
    sim: { fail: 0.08, warn: 0.2, pass: "Responded in 240 ms.", failMsg: "Responded in 2.4 s.", warnMsg: "Responded in 920 ms.", suggestion: "Serve the page from a CDN edge and cache rendered HTML." },
    measure: (c) => {
      const ms = c.probe?.reachable ? c.probe.responseMs : undefined;
      if (ms == null) return null;
      if (ms < 600) return { status: "pass", message: `Responded in ${ms} ms.` };
      if (ms < 1500) return { status: "warn", message: `Responded in ${ms} ms (target < 600 ms).`, suggestion: "Serve the page from a CDN edge and cache rendered HTML." };
      return { status: "fail", message: `Responded in ${ms} ms (target < 600 ms).`, suggestion: "Serve the page from a CDN edge and cache rendered HTML." };
    },
  },
  {
    id: "perf.size",
    name: "HTML payload size",
    category: "performance",
    severity: "medium",
    sim: { fail: 0.05, warn: 0.15, pass: "HTML is 42 KB.", failMsg: "HTML is 780 KB.", warnMsg: "HTML is 210 KB.", suggestion: "Move inlined data and SVGs out of the HTML and lazy-load below-the-fold content." },
    measure: (c) => {
      const b = c.probe?.reachable ? c.probe.bytes : undefined;
      if (b == null) return null;
      if (b < 150 * 1024) return { status: "pass", message: `HTML is ${fmtKb(b)}.` };
      if (b < 500 * 1024) return { status: "warn", message: `HTML is ${fmtKb(b)} (target < 150 KB).`, suggestion: "Move inlined data and SVGs out of the HTML." };
      return { status: "fail", message: `HTML is ${fmtKb(b)} (target < 150 KB).`, suggestion: "Move inlined data and SVGs out of the HTML and lazy-load below-the-fold content." };
    },
  },
  {
    id: "perf.compression",
    name: "Text compression enabled",
    category: "performance",
    severity: "medium",
    sim: { fail: 0.06, warn: 0, pass: "Responses are served with Brotli.", failMsg: "HTML is served uncompressed.", suggestion: "Enable gzip or Brotli compression at your host or CDN." },
    measure: (c) => (c.probe?.reachable && c.probe.compressed != null ? (c.probe.compressed ? { status: "pass", message: "Response is compressed." } : { status: "warn", message: "No content-encoding reported on the HTML response.", suggestion: "Enable gzip or Brotli compression at your host or CDN." }) : null),
  },
  {
    id: "perf.caching",
    name: "Cache headers set",
    category: "performance",
    severity: "low",
    sim: { fail: 0, warn: 0.25, pass: "Cache-Control is configured.", failMsg: "", warnMsg: "No Cache-Control header.", suggestion: "Set Cache-Control so repeat visits avoid re-downloading the page." },
    measure: (c) => {
      const hd = c.probe?.reachable ? c.probe.headers : undefined;
      if (!hd) return null;
      return hd.cacheControl ? { status: "pass", message: `Cache-Control: ${hd.cacheControl}` } : { status: "warn", message: "No Cache-Control header.", suggestion: "Set Cache-Control so repeat visits avoid re-downloading the page." };
    },
  },
  {
    id: "perf.scripts",
    name: "Script count",
    category: "performance",
    severity: "medium",
    sim: { fail: 0.05, warn: 0.15, pass: "8 scripts in the document.", failMsg: "41 scripts in the document.", warnMsg: "19 scripts in the document.", suggestion: "Bundle and defer non-critical scripts; drop unused third-party tags." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      const n = h.scriptCount;
      if (n <= 15) return { status: "pass", message: `${n} script tag(s) in the document.` };
      if (n <= 30) return { status: "warn", message: `${n} script tags in the document.`, suggestion: "Bundle and defer non-critical scripts." };
      return { status: "fail", message: `${n} script tags in the document.`, suggestion: "Bundle and defer non-critical scripts; drop unused third-party tags." };
    },
  },
  {
    id: "perf.lcp",
    name: "Largest Contentful Paint",
    category: "performance",
    severity: "high",
    sim: { fail: 0.15, warn: 0.25, pass: "LCP 1.6 s (good).", failMsg: "LCP 4.6 s — hero image is 2.8 MB.", warnMsg: "LCP 3.1 s.", suggestion: "Compress and correctly size the hero image, and preload it." },
  },
  {
    id: "perf.cls",
    name: "Cumulative Layout Shift",
    category: "performance",
    severity: "medium",
    sim: { fail: 0.1, warn: 0.2, pass: "CLS 0.02 (good).", failMsg: "CLS 0.34 — web font swap shifts the hero.", warnMsg: "CLS 0.14.", suggestion: "Reserve space for images and embeds, and use font-display: optional or size-adjusted fallbacks." },
  },
  // --- seo
  {
    id: "seo.title",
    name: "Title length 10–60 characters",
    category: "seo",
    severity: "medium",
    sim: { fail: 0.05, warn: 0.2, pass: "Title is 48 characters.", failMsg: "Title is “Vite + React”.", warnMsg: "Title is 74 characters and will be truncated.", suggestion: "Write a unique 10–60 character title that names the page and brand." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      const t = h.title ?? "";
      if (!t) return { status: "fail", message: "No title.", suggestion: "Write a unique 10–60 character title." };
      if (/^(vite \+ react|react app|lovable app|untitled|document)$/i.test(t.trim())) return { status: "fail", message: `Title is a template default: “${t}”.`, suggestion: "Replace the boilerplate title with one that names the page and brand." };
      if (t.length < 10 || t.length > 60) return { status: "warn", message: `Title is ${t.length} characters.`, suggestion: "Keep titles between 10 and 60 characters." };
      return { status: "pass", message: `Title is ${t.length} characters.` };
    },
  },
  {
    id: "seo.description",
    name: "Meta description",
    category: "seo",
    severity: "medium",
    sim: { fail: 0.15, warn: 0.15, pass: "Description is 142 characters.", failMsg: "No meta description.", warnMsg: "Description is 34 characters.", suggestion: "Add a 50–160 character meta description summarising the page." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      const d = h.metaDescription ?? "";
      if (!d) return { status: "fail", message: "No meta description.", suggestion: "Add a 50–160 character meta description summarising the page." };
      if (d.length < 50 || d.length > 160) return { status: "warn", message: `Description is ${d.length} characters.`, suggestion: "Aim for 50–160 characters." };
      return { status: "pass", message: `Description is ${d.length} characters.` };
    },
  },
  {
    id: "seo.canonical",
    name: "Canonical URL",
    category: "seo",
    severity: "low",
    sim: { fail: 0, warn: 0.3, pass: "Canonical link present.", failMsg: "", warnMsg: "No canonical link.", suggestion: "Add <link rel=\"canonical\"> to avoid duplicate-content issues." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      return h.canonical ? { status: "pass", message: `Canonical: ${h.canonical}` } : { status: "warn", message: "No canonical link.", suggestion: "Add <link rel=\"canonical\"> to avoid duplicate-content issues." };
    },
  },
  {
    id: "seo.og",
    name: "Social share tags",
    category: "seo",
    severity: "low",
    sim: { fail: 0, warn: 0.35, pass: "og:title and og:image present.", failMsg: "", warnMsg: "og:image missing — shares render without a preview.", suggestion: "Add og:title, og:description and og:image tags." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      if (h.ogTitle && h.ogImage) return { status: "pass", message: "og:title and og:image present." };
      return { status: "warn", message: `Missing: ${[!h.ogTitle && "og:title", !h.ogImage && "og:image"].filter(Boolean).join(", ")}.`, suggestion: "Add og:title, og:description and og:image tags." };
    },
  },
  {
    id: "seo.indexable",
    name: "Page is indexable",
    category: "seo",
    severity: "high",
    sim: { fail: 0.04, warn: 0, pass: "No noindex directive.", failMsg: "robots meta is set to noindex.", suggestion: "Remove noindex before launch so search engines can list the page." },
    measure: (c) => {
      const h = html(c);
      if (!h) return null;
      return h.noindex ? { status: "fail", message: "robots meta is set to noindex.", suggestion: "Remove noindex before launch so search engines can list the page." } : { status: "pass", message: "No noindex directive." };
    },
  },
];

export const CHECK_CATALOG = CHECKS.map((c) => ({ id: c.id, category: c.category, severity: c.severity }));

/* ---------- scoring rules ---------- */
export function weightOf(severity: Severity): number {
  return Math.max(1, SEVERITY_PENALTY[severity]);
}

/** Weighted score 0–100. Fails lose their full weight, warnings half. Skipped checks are ignored. */
export function computeScore(checks: Pick<CheckResult, "status" | "severity">[]): number {
  const counted = checks.filter((c) => c.status !== "skip");
  if (counted.length === 0) return 0;
  let total = 0;
  let lost = 0;
  for (const c of counted) {
    const w = weightOf(c.severity);
    total += w;
    if (c.status === "fail") lost += w;
    else if (c.status === "warn") lost += w / 2;
  }
  return Math.round(100 * (1 - lost / total));
}

/**
 * Failed: any critical check fails, or score < 50.
 * Passed: no failing checks and score ≥ the pass threshold (warnings allowed).
 * Warning: everything in between.
 */
export function deriveStatus(
  checks: Pick<CheckResult, "status" | "severity">[],
  score: number,
  passThreshold = DEFAULT_PASS_THRESHOLD,
): "passed" | "warning" | "failed" {
  const criticalFail = checks.some((c) => c.status === "fail" && c.severity === "critical");
  if (criticalFail || score < 50) return "failed";
  const anyFail = checks.some((c) => c.status === "fail");
  if (!anyFail && score >= passThreshold) return "passed";
  return "warning";
}

/* ---------- run generation ---------- */
export interface GenerateInput {
  url: string;
  profile: TestProfile;
  browser: BrowserId;
  device: DeviceId;
  instructions?: string | null | undefined;
  probe?: ProbeResult | undefined;
  seed?: string | undefined;
  passThreshold?: number | undefined;
}

export function generateRun(input: GenerateInput): RunOutcome {
  const seed = input.seed ?? `${input.url}|${input.profile}|${input.browser}|${input.device}|${Date.now()}`;
  const rng = mulberry32(hashString(seed));
  const ctx: Ctx = { probe: input.probe, rng, device: input.device, browser: input.browser };
  const categories = PROFILES[input.profile].categories;
  const deviceBias = input.device === "mobile" ? 1.5 : input.device === "tablet" ? 1.2 : 1;
  const browserBias = input.browser === "webkit" ? 1.15 : 1;

  const checks: CheckResult[] = [];
  for (const def of CHECKS) {
    if (!categories.includes(def.category)) continue;
    const name = typeof def.name === "function" ? def.name(ctx) : def.name;
    const durationMs = Math.round(120 + rng() * 1400);
    const measured = def.measure?.(ctx);
    if (measured) {
      checks.push({ id: def.id, name, category: def.category, severity: def.severity, ...measured, source: "measured", durationMs });
      continue;
    }
    // If the probe proved the page is unreachable, browser checks can't run.
    if (input.probe && !input.probe.reachable) {
      checks.push({ id: def.id, name, category: def.category, severity: def.severity, status: "skip", message: "Skipped — page was not reachable.", source: "simulated", durationMs: 0 });
      continue;
    }
    const bias = (def.category === "responsive" ? deviceBias : 1) * browserBias;
    const r = rng();
    let status: CheckStatus = "pass";
    if (r < def.sim.fail * bias) status = "fail";
    else if (r < (def.sim.fail + def.sim.warn) * bias) status = "warn";
    checks.push({
      id: def.id,
      name,
      category: def.category,
      severity: def.severity,
      status,
      message: status === "pass" ? def.sim.pass : status === "fail" ? def.sim.failMsg : (def.sim.warnMsg ?? def.sim.failMsg),
      suggestion: status === "pass" ? undefined : def.sim.suggestion,
      source: "simulated",
      durationMs,
    });
  }

  const instr = input.instructions?.trim();
  if (instr) {
    const r = rng();
    const status: CheckStatus = r < 0.2 ? "warn" : "pass";
    checks.push({
      id: "ai.custom",
      name: `Custom instruction: “${instr.length > 60 ? instr.slice(0, 57) + "…" : instr}”`,
      category: categories[categories.length - 1] ?? "smoke",
      severity: "medium",
      status,
      message:
        status === "pass"
          ? "AI reviewer followed the instruction and found no problems (simulated)."
          : "AI reviewer could only partially verify this instruction (simulated).",
      suggestion: status === "warn" ? "Connect a real browser + AI provider to execute custom instructions end-to-end." : undefined,
      source: "simulated",
      durationMs: Math.round(800 + rng() * 2400),
    });
  }

  const score = computeScore(checks);
  const status = deriveStatus(checks, score, input.passThreshold);
  const fails = checks.filter((c) => c.status === "fail");
  const warns = checks.filter((c) => c.status === "warn");
  const issuesCount = fails.length + warns.length;
  const criticalCount = fails.filter((c) => c.severity === "critical").length;
  const counted = checks.filter((c) => c.status !== "skip");
  const passedCount = counted.filter((c) => c.status === "pass").length;
  const measuredCount = checks.filter((c) => c.source === "measured").length;
  const top = [...fails].sort((a, b) => weightOf(b.severity) - weightOf(a.severity))[0];

  const worstCategory = (() => {
    const tally = new Map<CheckCategory, number>();
    for (const c of [...fails, ...warns]) tally.set(c.category, (tally.get(c.category) ?? 0) + weightOf(c.severity));
    return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  })();

  const parts = [
    `${passedCount} of ${counted.length} checks passed on ${BROWSERS[input.browser].label} · ${DEVICES[input.device].label}.`,
    issuesCount === 0
      ? "No issues found — this page is in good shape."
      : `${issuesCount} issue${issuesCount === 1 ? "" : "s"} found${criticalCount ? `, ${criticalCount} critical` : ""}.`,
    top ? `Fix first: ${top.name} — ${top.message}` : "",
    worstCategory && issuesCount > 2 ? `${CATEGORY_LABELS[worstCategory]} needs the most attention.` : "",
    measuredCount > 0
      ? `${measuredCount} checks were measured from the live page; the rest are simulated.`
      : "All checks in this run are simulated demo output.",
  ];

  const durationMs =
    Math.round(checks.reduce((s, c) => s + c.durationMs, 0) * 0.45) + (input.probe?.responseMs ?? 0) + 1800;

  return {
    status,
    score,
    checks,
    summary: parts.filter(Boolean).join(" "),
    durationMs,
    issuesCount,
    criticalCount,
    mode: measuredCount > 0 ? "hybrid" : "simulated",
  };
}

export function runSteps(profile: TestProfile, browser: BrowserId, device: DeviceId): string[] {
  const cats = PROFILES[profile].categories;
  return [
    `Provisioning ${BROWSERS[browser].label} on ${DEVICES[device].label} (${DEVICES[device].viewport})`,
    "Fetching page and capturing response",
    ...cats.map((c) => `Running ${CATEGORY_LABELS[c].toLowerCase()} checks`),
    "Compiling AI summary and suggestions",
  ];
}

/**
 * Stored checks may be compact ({ id, status, durationMs }) — sample rows use this to stay small.
 * Fill any missing fields from the catalogue so the UI always gets complete CheckResults.
 */
export function hydrateChecks(raw: unknown): CheckResult[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): CheckResult[] => {
    if (!item || typeof item !== "object") return [];
    const c = item as Partial<CheckResult> & { id?: string };
    if (!c.id || !c.status) return [];
    const def = CHECKS.find((d) => d.id === c.id);
    if (!def) {
      return c.name && c.category && c.severity && c.message ? [{ source: "simulated", durationMs: 0, ...c } as CheckResult] : [];
    }
    const simMsg = c.status === "pass" ? def.sim.pass : c.status === "warn" ? (def.sim.warnMsg ?? def.sim.failMsg) : c.status === "skip" ? "Skipped." : def.sim.failMsg;
    return [
      {
        id: c.id,
        name: c.name ?? (typeof def.name === "string" ? def.name : "No horizontal overflow"),
        category: c.category ?? def.category,
        severity: c.severity ?? def.severity,
        status: c.status,
        message: c.message ?? simMsg,
        suggestion: c.suggestion ?? (c.status === "pass" || c.status === "skip" ? undefined : def.sim.suggestion),
        source: c.source ?? "simulated",
        durationMs: c.durationMs ?? 0,
      },
    ];
  });
}