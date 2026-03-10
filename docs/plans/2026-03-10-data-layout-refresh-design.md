# Lumina Real Data and Dashboard Refresh Design

## Goal

Repair the project's real market data flow and redesign the dashboard so it feels like a polished dark trading terminal instead of a generic glass UI. The new dashboard should use real portfolio-derived metrics wherever market pricing exists, degrade clearly for manually tracked assets, and preserve the existing product structure across Dashboard, Market, Analysis, and Chat.

## Current Problems

- The dashboard hero widgets are static mock values and do not reflect the current portfolio.
- The portfolio trend chart is fabricated from percentage multipliers instead of historical market data.
- `services/marketService.ts` fetches CoinGecko directly from the browser while other market data is routed through `server.ts`, which creates fragile behavior and inconsistent error handling.
- Newly added assets often lack enough pricing metadata to participate in subsequent quote refreshes.
- The visual system is scattered across Tailwind config in `index.html`, the referenced `/index.css` file is missing, and the dashboard layout lacks hierarchy.

## Desired Outcome

### Data Behavior

- All market data entry points should be routed through the local server.
- The dashboard should compute summary metrics from live portfolio state:
  - total portfolio value
  - 24h change in dollars
  - 24h change percent
  - priced asset coverage
  - largest position share
- The main chart should show a real historical series built from assets with quote history.
- Assets without market history should remain visible in holdings and allocation views, but should be excluded from the chart with an explicit coverage note.

### UI Behavior

- Keep the current dark, high-tech tone.
- Replace the current loose card stack with a stronger three-zone dashboard:
  - command header and summary strip
  - main analytics panel plus side intelligence panel
  - holdings and portfolio management section
- Upgrade surface treatment with a more intentional terminal-like visual language:
  - deep graphite backgrounds
  - cool blue and cyan highlights
  - subtle grids, glows, and panel shadows
  - stronger numeric typography

## Architecture

### Server Data Layer

`server.ts` becomes the single browser-facing data gateway.

- Keep `/api/quote` and `/api/history` for Yahoo Finance quotes and historical candles.
- Add `/api/crypto-list` to proxy the CoinGecko top-market-cap list server-side.
- Normalize server responses enough that the frontend can rely on array/object shape without having to guess around malformed payloads.
- Return graceful 5xx JSON responses with stable error keys for frontend fallbacks.

### Client Market Layer

`services/marketService.ts` remains responsible for:

- ticker subscription state
- refreshing quotes and history
- exposing searchable crypto symbols

But it will change to:

- fetch crypto discovery data from `/api/crypto-list`
- use defensive parsing for all API payloads
- preserve previously known ticker values if a refresh partially fails

### Dashboard Data Model

`App.tsx` will derive a dashboard snapshot from current assets.

The snapshot should include:

- derived metrics for the hero strip
- historical valuation series assembled from per-asset history
- market coverage percentage for chart transparency
- top movers or watched assets for the side panel

This keeps `Dashboard.tsx` mostly presentational and easier to evolve visually.

## UX Decisions

### Realistic Degradation

Not every asset in this app is market-priced. Real estate, collectibles, and manually tracked items may not have API-backed quotes. Instead of fabricating time series for these assets:

- show them in the holdings table and allocation ring
- count them toward total portfolio value
- exclude them from historical chart generation unless valid market history exists
- disclose priced coverage in the dashboard copy

This keeps the experience honest while still letting the dashboard feel useful.

### Summary Widgets

The old default widgets become a compact metrics strip with live values. User-added widgets remain supported, but they should feel secondary to the main dashboard shell instead of defining the entire top section.

### Portfolio Editing

When a user adds a trackable asset:

- preserve `quantity`
- initialize `currentPrice` when possible
- recompute `value` and `allocation`

For manually priced assets, the modal should still allow value-only entry without breaking later quote refreshes.

## Visual System

The refresh introduces a proper global stylesheet in `/index.css` for shared tokens and atmosphere:

- layered radial and linear background treatments
- panel chrome classes
- chip, stat, and button primitives
- subtle grid and scanline effects

Tailwind utility usage remains, but the stylesheet provides a stable visual base so components stop duplicating surface styles ad hoc.

## Files Expected to Change

- `server.ts`
- `App.tsx`
- `components/Dashboard.tsx`
- `components/Market.tsx`
- `components/GlassCard.tsx`
- `services/marketService.ts`
- `index.css`
- optional small updates in `package.json` for test scripts and dependencies

## Testing Strategy

- Add automated tests for dashboard data derivation and/or server normalization helpers.
- Run production build to validate the Vite bundle.
- Launch the app locally and verify:
  - quotes load
  - crypto search list populates
  - dashboard summary values change with portfolio state
  - the redesigned layout renders correctly

## Risks

- Yahoo Finance historical coverage may be incomplete for non-standard symbols.
- CoinGecko may rate limit even through the server, so the server proxy must fail softly.
- Because the app is using CDN Tailwind plus local Vite bundling, CSS changes need build verification to ensure all referenced files exist.

## Recommendation

Proceed with the integrated refresh:

1. unify market data through the server
2. derive honest live dashboard metrics
3. redesign the dashboard shell and shared styling
4. add automated verification for the new data pipeline
