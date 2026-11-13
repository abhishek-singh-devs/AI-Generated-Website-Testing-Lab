# Integration roadmap

## Verification status

The Lovable preview completed `bun run typecheck`, `bun run test` (3 files, 15 tests), and `bun run build` successfully at its latest implementation commit. A signed-in browser click-through remains unverified because no test account was available; no production test account was created.


The core demo workflows are implemented. The remaining roadmap is provider-backed functionality, and the UI must continue to label these as unavailable until they are connected.

- [ ] Connect a hosted Playwright/browser provider for screenshots, DOM rendering, responsive viewport checks, console capture, and Core Web Vitals.
- [ ] Connect a real AI reviewer for instruction-based analysis and generated fix summaries.
- [ ] Add a scheduler/worker before enabling automatic daily or weekly suite execution.
- [ ] Connect an email delivery provider before enabling failure alerts or weekly digests.
