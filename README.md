# AI-Generated Website Testing Lab

A full-stack web app for running QA checks against AI-generated websites. Paste a URL, pick a test profile, browser and device, and get a scored report with pass/fail checks, issue severity, suggested fixes and a re-run action. Every run is saved to a searchable history.

> **Demo execution notice.** HTTP status, response time, payload size, security headers and HTML structure are **measured** by fetching the real page server-side. Browser rendering, layout overflow, contrast, Core Web Vitals and the AI reviewer are **simulated** with deterministic demo output. Each check in a report is labelled *Measured* or *Simulated*. No API keys are required.

## Features

- **Landing page** (`/`) with sign-in / dashboard links that follow your session.
- **Accounts** — email + password (with reset), Google and Lovable sign-in.
- **Overview** — tests run, pass rate, issues found, average duration, 14-day trend chart, issues by category, most common issues and recent runs.
- **New Test** — URL validation (rejects private/local addresses), 6 profiles (smoke, accessibility, responsive, performance, SEO, comprehensive), browser + device selectors, optional instructions, animated progress log, then a saved result.
- **Run details** — score ring, summary, checks grouped by category, severity filters, suggestions, JSON/Markdown export, re-run and delete.
- **Test History** — search, filter by status/profile/source, CSV export.
- **Test Suites** — create, edit, duplicate, pause and delete saved configurations; "Run now" pre-fills a new test. Sample suites are read-only.
- **Settings** — display name, default profile/browser/device, pass threshold, live-fetch toggle, notification preferences, clear history.
- Empty, loading and error states throughout; toast feedback for every action; responsive down to phone width.

## Routes

| Path | Access | What it does |
| --- | --- | --- |
| `/` | Public | Landing page; header buttons switch to "Open dashboard" when signed in |
| `/auth` | Public | Sign in / sign up / forgot password; `?redirect=/path` returns you after sign-in |
| `/reset-password` | Public | Set a new password from the emailed link |
| `/dashboard` | Signed in | Overview metrics, trend chart, issues by category, recent runs |
| `/tests/new` | Signed in | New Test form + simulated progress + result. `?rerun=<runId>` re-runs a run, `?suite=<suiteId>` pre-fills from a suite, `?url=` pre-fills the URL |
| `/history` | Signed in | Search/filter runs. Filters live in the URL: `q`, `status`, `profile`, `range` (`24h`/`7d`/`30d`), `source` (`mine`/`sample`), `page` |
| `/runs/$runId` | Signed in | Full run report with re-run, export and delete |
| `/suites` | Signed in | Create, edit, duplicate, pause/enable, delete and "Run now" for saved suites |
| `/settings` | Signed in | Defaults, pass threshold, execution mode, notification preferences, clear history |

Signed-in pages live under `src/routes/_authenticated/`; that layout checks the session in the browser and redirects to `/auth` otherwise.

## Architecture

| Layer | Tech |
| --- | --- |
| Framework | TanStack Start v1 (React 19, file-based routing, SSR, server functions), Vite |
| UI | Tailwind CSS v4 (tokens in `src/styles.css`), shadcn/ui, lucide icons, Recharts |
| Data | TanStack Query on the client; Lovable Cloud (Postgres + Auth) with row-level security |
| Server | `createServerFn` page probe in `src/lib/probe.functions.ts` |

```
src/
  routes/               index (landing), auth, reset-password
    _authenticated/     dashboard, tests.new, history, runs.$runId, suites, settings (signed-in only)
  components/app-shell  sidebar + header layout
  components/lab/       shared panels, status badges, score ring, runs table
  lib/testing/          types, constants, URL validation, check engine & scoring
  lib/lab-data.ts       queries and mutations against the database
  lib/probe.functions.ts server-side fetch of the target page
  lib/history-filter.ts history search/filter logic
  test/                 vitest tests (routing, URL validation, scoring, history filters)
```

### Data model

**`test_runs`** — one row per run
`id`, `user_id`, `suite_id` (nullable), `url`, `profile`, `browser`, `device`, `instructions`, `status` (`passed`/`warning`/`failed`/`error`), `score` (0–100), `duration_ms`, `checks` (JSON array of check results), `summary`, `issues_count`, `critical_count`, `mode` (`hybrid` = live fetch + simulation, `simulated`), `is_sample`, `created_at`, `completed_at`.

Each entry in `checks`: `id`, `name`, `category`, `status` (`pass`/`fail`/`warn`/`skip`), `severity` (`critical`/`high`/`medium`/`low`/`info`), `message`, `suggestion`, `source` (`measured`/`simulated`), `durationMs`.

**`test_suites`** — saved configurations
`id`, `user_id`, `name`, `description`, `target_url`, `profile`, `browsers[]`, `devices[]`, `schedule` (`manual`/`daily`/`weekly`), `enabled`, `is_sample`, `created_at`, `updated_at`.

**`user_settings`** — one row per user
`user_id`, `display_name`, `default_profile`, `default_browser`, `default_device`, `pass_threshold`, `notify_on_failure`, `live_probe`, `weekly_digest`, `updated_at`.

Users can only read and change their own rows. Sample runs and suites (`is_sample = true`) are readable by every signed-in user and cannot be edited.

### Measured vs simulated

| Measured from the live page fetch (when "Live page fetch" is on and the site is reachable) | Always simulated in this demo |
| --- | --- |
| Reachability & HTTP status, HTTPS, response time, page size, compression, cache headers, security headers | Browser rendering & console errors, broken-link crawl |
| `<title>`, charset, favicon, `lang`, image alt text, form labels, empty buttons, H1 count | Colour contrast, focus visibility |
| Viewport meta, zoom blocking, fixed-width elements, script count | Horizontal overflow, tap-target size |
| Meta description, canonical, Open Graph tags, `noindex` | Core Web Vitals (LCP, CLS) |
| | AI reviewer (custom instructions, run summary) |
| | Progress timing, browser/device emulation |
| | Suite schedules and email notifications (stored, never executed) |

Simulated checks are deterministic per URL/profile/browser/device, so a re-run gives stable demo results.

### Scoring

Each check has a severity weight (critical 25, high 12, medium 6, low 2, info 1). A failure loses its full weight, a warning half; skipped checks are ignored. Score = 100 × (1 − lost / total).

- **Failed** — any critical failure, or score under 50.
- **Passed** — no failures and score ≥ pass threshold (default 80, set in Settings).
- **Warning** — anything else.

## Setup

```sh
bun install
bun run dev        # http://localhost:8080
```

## Test commands

```sh
bun run test       # vitest run
bun run typecheck  # tsc --noEmit
bun run build      # production build (client + server worker)
```

| Test file | Covers |
| --- | --- |
| `src/test/app-routing.test.tsx` | `/` resolves to a real page |
| `src/test/testing-rules.test.ts` | URL validation (https added, private/local hosts, bad schemes, credentials) and scoring/status rules |
| `src/test/history-filter.test.ts` | History search, status, profile, date range and mine/sample filters |

### Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env` (auto) | Backend URL used by the browser client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` (auto) | Public (publishable) backend key |
| `VITE_SUPABASE_PROJECT_ID` | `.env` (auto) | Backend project id |

All three are created by Lovable Cloud and are safe to ship to the browser. No secret API keys are needed to run the demo.

## Configuration

- **Live page fetch** — Settings → Execution. Off = fully simulated runs.
- **Pass threshold** — Settings → Test defaults (50–100).
- **Real browser / AI providers** — not configured. To make simulated checks real, connect a hosted browser (e.g. Playwright on a browser service) inside the probe server function and route instructions/summaries through an AI model, then switch those checks' `source` to `measured`.

## Limitations

- Rendering, overflow, contrast, Core Web Vitals and AI review are simulated.
- The page fetch sees server HTML only; client-rendered content isn't executed.
- Suite schedules are saved but not executed automatically.
- Notification preferences are stored but no emails are sent.
- Local and private network URLs are blocked by design.