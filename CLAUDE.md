# Claude Handoff

Claude should use this file as the entry point when continuing work in this repository.

## Mission

Build a production-ready Polymarket Analytics Platform for reconstructing real wallet performance from historical Polymarket trades.

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

- V1 baseline: `docs/versions/V1_WALLET_ANALYZER.md`
- Next target: `docs/versions/V2_PERFORMANCE_ANALYTICS.md`
- Later modules:
  - `docs/versions/V3_WHALE_ANALYTICS.md`
  - `docs/versions/V4_COPY_TRADING_SIMULATOR.md`
  - `docs/versions/V5_WALLET_RANKING.md`
  - `docs/versions/V6_WALLET_SCREENER.md`
  - `docs/versions/V7_ALERT_SYSTEM.md`
  - `docs/versions/V8_INSTITUTIONAL_ANALYTICS.md`

## Current State

V1 has been implemented with:

- npm workspaces
- NestJS API
- Prisma schema and initial migration
- PostgreSQL and Redis via Docker Compose
- BullMQ wallet refresh queue
- Polymarket adapters
- Decimal.js analytics package
- Chrome Extension MV3 UI
- Wallet detection and manual search
- Overview, trades, positions, and PnL chart endpoints

## Rules For Claude

- Stay on one version at a time.
- Do not start V3 until V2 is done.
- Do not perform heavy analytics in the extension.
- Keep all money math in Decimal.js.
- Validate upstream API responses with Zod.
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

## Important Architectural Boundary

The Chrome extension is a client. It can display and request analytics. It must not reconstruct positions, run backtests, rank wallets, or compute heavy metrics.

The backend is the analytics authority.

## Current Verification State

V1 has been validated against five real Polymarket profile URLs with Playwright network traces and local API refreshes. Polymarket profile slugs must resolve to the embedded `0x...` URL address because that is what the Polymarket UI passes to Data API.

Before implementing V2:

1. Read `docs/versions/V1_WALLET_ANALYZER.md`.
2. Preserve the V1 regression checklist.
3. Treat the 1000-trade V1 sync cap as a known limitation until pagination/backfill is implemented.
4. Update `docs/DECISIONS.md` if adapter assumptions change.
