# Real Data and Dashboard Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Repair real market data fetching, replace fake dashboard analytics with portfolio-derived live metrics, and redesign the dashboard with a sharper dark-tech visual system.

**Architecture:** Route browser market requests through `server.ts`, derive dashboard analytics from asset state in `App.tsx`, and convert `Dashboard.tsx` into a more structured terminal-style presentation. Add a real shared stylesheet so the new visual system is consistent across panels and controls.

**Tech Stack:** React 19, TypeScript, Express, Vite, Yahoo Finance, CoinGecko proxying, Recharts

---

### Task 1: Establish Documentation and Baseline

**Files:**
- Create: `docs/plans/2026-03-10-data-layout-refresh-design.md`
- Create: `docs/plans/2026-03-10-data-layout-refresh.md`
- Verify: `index.html`

**Step 1: Confirm current build behavior**

Run: `npm run build`
Expected: build succeeds, with a warning that `/index.css` is missing.

**Step 2: Save the approved design and implementation plan**

Write both plan files so implementation has a stable spec and task list.

**Step 3: Commit the docs baseline**

Run:

```bash
git add docs/plans
git commit -m "docs: add dashboard refresh design and plan"
```

Expected: documentation commit created on the feature branch.

### Task 2: Move Crypto Discovery Behind the Server

**Files:**
- Modify: `server.ts`
- Modify: `services/marketService.ts`

**Step 1: Add a failing normalization path mentally before editing**

Target behaviors:
- `/api/crypto-list` returns an array or an empty array, never an arbitrary object.
- frontend no longer calls CoinGecko directly.

**Step 2: Implement server proxy and safe response shaping**

- add a server route for CoinGecko top coins
- validate array payloads before returning them
- include stable error JSON

**Step 3: Update market service to consume the new route**

- replace browser-side CoinGecko fetch with `/api/crypto-list`
- harden parsing for quote/history payloads
- keep prior state on partial failures

**Step 4: Verify**

Run:

```bash
npm run build
```

Expected: build passes with no runtime import errors.

### Task 3: Derive Live Dashboard Analytics

**Files:**
- Modify: `App.tsx`
- Modify: `types.ts`

**Step 1: Define dashboard snapshot types**

Add typed structures for:
- summary metrics
- historical chart points
- coverage metadata
- side-panel highlights

**Step 2: Implement derivation helpers**

Compute from current assets:
- total value
- 24h delta value and percent
- priced coverage
- concentration
- historical aggregate curve from priced assets with quote history

**Step 3: Replace static dashboard widget inputs**

Pass derived snapshot data into the dashboard instead of the old default metric cards.

**Step 4: Verify**

Run:

```bash
npm run build
```

Expected: type-safe build with dashboard fed by derived live data.

### Task 4: Redesign Dashboard Layout and Shared Styling

**Files:**
- Create: `index.css`
- Modify: `index.html`
- Modify: `components/GlassCard.tsx`
- Modify: `components/Dashboard.tsx`
- Modify: `App.tsx`
- Modify: `components/Market.tsx`

**Step 1: Create the new visual foundation**

- add CSS variables and shared classes in `index.css`
- keep the palette dark, cool, and technical
- provide reusable panel, chip, and button styles

**Step 2: Restructure dashboard layout**

- build a stronger hero section
- rebuild the metrics strip
- redesign the main analytics grid
- improve holdings table and portfolio modal styling

**Step 3: Align surrounding surfaces**

- update `GlassCard` so components inherit the new shell cleanly
- tune `App.tsx` frame and top navigation
- lightly refresh `Market.tsx` surfaces for consistency

**Step 4: Verify**

Run:

```bash
npm run build
```

Expected: bundle succeeds and no missing CSS file warning remains.

### Task 5: Add Automated Tests for Data Derivation

**Files:**
- Modify: `package.json`
- Create: `lib/dashboardData.ts` or similar helper module if needed
- Create: `tests/dashboardData.test.ts`

**Step 1: Isolate derivation logic into a testable module**

Move portfolio metric and chart derivation into a pure helper where practical.

**Step 2: Add failing tests**

Cover:
- priced coverage calculation
- 24h delta aggregation
- historical series aggregation with mixed priced/unpriced assets

**Step 3: Implement minimal fixes until tests pass**

Use Node’s built-in test runner or the smallest practical setup instead of introducing heavy tooling.

**Step 4: Verify**

Run:

```bash
npm test
npm run build
```

Expected: tests pass and production build still passes.

### Task 6: Manual Verification and Final Review

**Files:**
- Verify: `server.ts`
- Verify: `App.tsx`
- Verify: `components/Dashboard.tsx`
- Verify: `services/marketService.ts`

**Step 1: Start the app**

Run:

```bash
npm run dev
```

Expected: local app starts on port 3000.

**Step 2: Inspect core flows**

Verify:
- dashboard renders redesigned shell
- real quotes populate priced assets
- chart and summary values render without placeholder mock numbers
- market search dropdown loads symbols from the proxied crypto list

**Step 3: Request code review**

Review the completed diff for regressions, missing edge cases, and test gaps.

**Step 4: Summarize results**

Capture what changed, what was verified, and any remaining limitations.
