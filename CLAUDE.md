# Claude Handoff

Claude should use this file as the entry point when continuing work in this repository.

## Mission

Build a production-ready Polymarket Copy-Trading Intelligence Platform for evaluating Polymarket wallets, finding copy candidates, simulating manual copy strategies, and monitoring trader actions.

The product should feel like a specialized mix of Nansen, Arkham, Dexscreener, and Whale Tracker for Polymarket wallets.

This is not a trading bot. Never add live order placement, wallet signing, private-key handling, or auto-trading.

## First Files To Read

Read in this order:

1. `AGENTS.md`
2. `docs/DECISIONS.md`
3. `docs/ARCHITECTURE.md`
4. `docs/API_CONTRACTS.md`
5. `docs/ROADMAP.md`
6. Relevant version spec from `docs/versions/`

## Version Specs

- Done: `docs/versions/V1_WALLET_ANALYZER.md`
- Done: `docs/versions/V2_PERFORMANCE_ANALYTICS.md`
- Done: `docs/versions/V3_COPY_READINESS.md`
- Done: `docs/versions/V4_COPY_TRADING_SIMULATOR.md`
- Done: `docs/versions/V5_COPYABILITY_RANKING.md`
- Next target: `docs/versions/V5_5_NEW_MARKET_SCREENER.md` (standalone market-discovery module, no wallet-analytics dependency)
- Then: `docs/versions/V6_COPY_CANDIDATE_SCREENER.md`
- Later modules:
  - `docs/versions/V7_COPY_ACTION_FEED_ALERTS.md`
  - `docs/versions/V8_PORTFOLIO_MULTI_WALLET_ANALYTICS.md`

## Current State

V1 through V4 are implemented with:

- npm workspaces; NestJS API; Prisma schema and migrations; PostgreSQL and Redis via Docker Compose; BullMQ wallet refresh queue; Polymarket adapters; Decimal.js analytics package; Chrome Extension MV3 UI plus a full-page web dashboard (`apps/web`).
- V1: wallet detection, manual search, overview, trades, positions, and PnL chart endpoints.
- V2: realized/unrealized PnL, ROI, winrate variants, drawdowns, streaks, trade highlights, profit distribution, and win/loss charts.
- V3: copy-readiness scoring, category exposure, oversized-trade classification, data-validation summary, and readiness interpretation.
- V4: historical copy-trading simulator (`packages/analytics/src/simulator.ts`) with settings validation, `POST/GET /wallets/:address/copy-simulations` endpoints persisting to the `CopySimulation` table, and simulator UI in both web and extension.

## Rules For Claude

- Stay on one version at a time. The next version is V5.
- Do not start a version until the previous version's done criteria pass.
- Do not perform heavy analytics in the extension or web client.
- Keep all money math in Decimal.js; serialize money values as strings in DTOs.
- Validate upstream API responses and all API inputs with Zod.
- Add Prisma migrations for schema changes.
- Update docs when contracts or decisions change.
- Run tests, typecheck, and build before handing off.

## Verification Commands

```bash
npm test
npm run typecheck
npm run build
```

For local runtime verification:

```bash
docker compose up -d
XDG_CACHE_HOME=.cache npm run prisma:migrate
npm run dev:api
curl http://localhost:3000/api/v1/health
```

If typecheck fails with missing `Prisma.Decimal` / `Prisma.InputJsonValue` exports after a fresh install, regenerate the client: `cd apps/api && npx prisma generate`.

## Important Architectural Boundary

The Chrome extension and web dashboard are clients. They can display and request analytics. They must not reconstruct positions, run backtests, rank wallets, or compute heavy metrics.

The backend is the analytics authority.

## Current Verification State

- V1 was validated against five real Polymarket profile URLs with Playwright network traces and local API refreshes. Polymarket profile slugs must resolve to the embedded `0x...` URL address because that is what the Polymarket UI passes to Data API.
- The public Data API sync window (~1000 trades in V1, paginated since) is a known limitation; copy-readiness responses surface it via `dataValidation.apiWindowLimited`, and simulator results inherit the same caveat.
- V4 simulator semantics (delay fills, proportional sells, realized-basis equity, conservative unrealized marking) are documented in `docs/DECISIONS.md` under "V4 Copy Trading Simulator".

Before implementing V5:

1. Read `docs/versions/V5_COPYABILITY_RANKING.md`.
2. Preserve the V1 regression checklist and existing test suites.
3. Reuse persisted simulator outputs as ranking inputs instead of recomputing.
4. Update `docs/DECISIONS.md` if adapter or simulator assumptions change.
