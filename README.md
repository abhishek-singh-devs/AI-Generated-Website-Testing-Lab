# SiteCheck Studio

SiteCheck Studio is a responsive SaaS-style website QA workspace for AI-generated sites. It turns a public URL into a structured report, organizes demo runs, and makes the boundary between measured page facts and simulated browser/AI findings explicit.

> **Demo execution:** The server-side probe can fetch a public page and measure HTTP status, response time, response headers, payload size, and selected HTML metadata. Browser rendering, screenshots, visual breakpoints, Core Web Vitals, console inspection, internal-link crawling, and AI review are simulated. Daily/weekly suite schedules and notification preferences are saved as configuration only; they are not automatically executed or delivered.

## Product features

- **Public landing page** with capability overview, test profiles, workflow explanation, and clear demo limitations.
- **Overview dashboard** with run metrics, score trends, issue categories, recurring findings, and recent reports.
- **New Test workflow** with URL validation, six profiles, browser/device choices, optional instructions, simulated progress/logs, cancellation, and saved results.
- **Run reports** with score, status, check-by-check results, severity filters, measured/simulated source badges, fix suggestions, rerun, and export actions.
- **Test History** with URL/instruction/summary search, status/profile/date/source filters, pagination, and CSV export.
- **Test Suites** with create/edit/duplicate/delete, enable/disable, run-now prefill, and manual/daily/weekly preference fields. Schedules are not automatically triggered.
- **Settings** for profile/browser/device defaults, pass threshold, live-probe preference, notification preferences, and personal history cleanup.
- **Authentication** using Supabase email/password and configured OAuth providers.
- **Sample data** for exploring the dashboard and reports before running a personal test.

## Stack

- React 19 + TypeScript
- TanStack Start and TanStack Router
- TanStack Query
- Tailwind CSS 4 and shadcn/Radix UI components
- Supabase Auth + Postgres with row-level security
- Vitest + Testing Library
- Bun for install and CI

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/auth` | Sign in, create account, and request a password reset |
| `/reset-password` | Set a new password |
| `/dashboard` | Authenticated overview |
| `/tests/new` | Start a demo QA run |
| `/history` | Search/filter/paginate previous runs |
| `/runs/$runId` | Detailed run report |
| `/suites` | Reusable test-suite management |
| `/settings` | Personal workspace defaults and preferences |

## Local development

### Prerequisites

- Bun (the repository lockfile and CI use Bun)
- Node.js 20.19+ or a current Node 22+ release
- A Supabase project with the app's tables and Auth configured

### Setup

1. Clone the repository.
2. Install dependencies.
3. Copy the environment template and set the values from your Supabase project.
4. Start the development server.

```bash
git clone https://github.com/abhishek-singh-devs/AI-Generated-Website-Testing-Lab.git
cd AI-Generated-Website-Testing-Lab
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

The development server prints its local URL. Use the public landing page, then sign in to open the workspace. Sample rows are available to authenticated users.

## Environment variables

Copy `.env.example` and provide the same Supabase project URL and publishable key for the browser and server:

| Variable | Used by | Required |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser Supabase client | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser Supabase client | Yes |
| `SUPABASE_URL` | Server-side Supabase auth middleware/client | Yes |
| `SUPABASE_PUBLISHABLE_KEY` | Server-side Supabase auth middleware/client | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional server-only admin client | Only if an admin operation uses it; never expose with a `VITE_` prefix |
| `LOVABLE_DB_MIGRATION_URL` | Drizzle migration tooling | Only for migration work |

Do not commit a populated `.env`. In Vercel, add the four required URL/publishable-key variables to the Production, Preview, and Development environments. The publishable key is intended for client use; keep any service-role key server-only.

## Database and authentication

The app reads and writes `test_runs`, `test_suites`, and `user_settings` in Supabase. Row-level security policies allow a user to access their own rows and the designated shared sample rows. The SQL migration is in `drizzle/migrations/0000_create_testing_lab_schema.sql`; the generated Supabase types are in `src/integrations/supabase/types.ts`.

Configure email/password Auth and the OAuth providers you want to enable in Supabase. Add the app's local and deployed origins to the Auth redirect allow-list. The app does not embed database credentials or service-role keys in source.

## Verification commands

```bash
bun run test       # unit and routing tests
bun run typecheck  # strict TypeScript check
bun run build      # production Vite/TanStack Start build
bun run lint       # ESLint
bun run preview    # preview a production build locally
```

GitHub Actions runs tests, typecheck, and build on pushes to `main` and on pull requests.

## Execution model and limitations

- **Measured:** a single server-side fetch of the supplied public URL; response status/final URL/time, response headers, limited body bytes, and regex-based HTML metadata inspection.
- **Simulated:** browser rendering, screenshot capture, layout/overflow checks, visual contrast, performance vitals, console/link crawling, AI summaries/review, and any related progress/result claims.
- **Manual only:** suite “daily” or “weekly” preferences do not schedule runs.
- **Not connected:** email notifications are preference toggles only.

These limitations are surfaced in the New Test workflow, reports, settings, and UI badges. The app is a QA workflow demo rather than a hosted Playwright or AI testing service.
