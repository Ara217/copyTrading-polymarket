# Version 1: Minimum Viable Wallet Analyzer

## Status

Implemented as the current baseline. Keep this file as the regression checklist before starting V2.

## Goal

Build a working Chrome Extension and NestJS backend that can detect or accept a Polymarket wallet address, sync wallet data through backend workers, reconstruct positions, and display overview metrics, trades, positions, and PnL charts. V1 is the foundation for later copy-trading intelligence.

## Non-Goals

- No auto-trading.
- No copy execution.
- No copy recommendations.
- No user accounts.
- No copy readiness, simulator, copyability ranking, screener, action feed, alerts, or multi-wallet copy analytics.

## Required Architecture

- Extension owns UI, detection, search, charts, and tables.
- Backend owns all analytics, position reconstruction, PnL, storage, queueing, and Polymarket API calls.
- Wallet refresh always goes through BullMQ.
- Money math must use Decimal.js.
- V1 uses local Docker Compose for PostgreSQL and Redis.

## Current Surfaces

- API app: `apps/api`
- Extension app: `apps/extension`
- Shared validation: `packages/shared`
- Shared DTOs: `packages/types`
- Analytics engine: `packages/analytics`
- Database schema: `apps/api/prisma/schema.prisma`

## Endpoints

- `POST /api/v1/wallets/:address/refresh`
- `GET /api/v1/wallets/:address/overview`
- `GET /api/v1/wallets/:address/trades`
- `GET /api/v1/wallets/:address/positions`
- `GET /api/v1/wallets/:address/pnl-chart`

## Data Models

- `Wallet`
- `Market`
- `Trade`
- `Position`
- `WalletMetrics`
- `CopySimulation`
- `SyncJob`

## Regression Checklist

- `docker compose up -d`
- `XDG_CACHE_HOME=.cache npm run prisma:migrate`
- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run dev:api`
- `curl http://localhost:3000/api/v1/health`
- Refresh at least one Polymarket profile slug shaped like `0x...-timestamp` and confirm the API returns the embedded `0x...` address.
- For high-activity wallets, confirm `/trades` returns more than the few rows visible in the extension viewport and that the extension header shows the loaded trade count.

## Real Wallet Verification

On June 7, 2026, V1 was checked with Playwright against these Polymarket profile pages:

- `0xcf609d3256f0f37f0595e5dc64012fa3a8fea6f5-1771809916847`
- `0x4e20f8e9fed43de49cb5eb92c3913d852ab6d6dd-1763117481321`
- `0xfbd8c9c22ca76b3662d0e53a4f79719fdc684027-1779347618060`
- `0xa9c4b118095a4f67ba9ba461aadf6a9cfe5e7433-1721318888203`
- `0xdbdd45150249e229eb4ca8aa48a30dca21faa5de-1757094771846`

Findings:

- Polymarket profile pages call Data API with the embedded URL address.
- All five backend refresh jobs completed after Gamma lookup batching.
- Stored trade counts depended on wallet activity and the configured public Data API sync window.
- The extension loaded 100 display rows and showed `100 loaded`; only seeing a few rows is a viewport/scrolling concern, not missing API data.

## Known Follow-Up Risks

- Future enhancement: investigate deeper historical backfill sources for wallets whose public Data API history is incomplete for lifetime performance claims.
- CLOB token id mapping may need refinement beyond the V1 condition-id fallback.
- Extension bundle is large because ECharts is bundled eagerly.
