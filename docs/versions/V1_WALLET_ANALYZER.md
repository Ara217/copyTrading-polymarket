# Version 1: Minimum Viable Wallet Analyzer

## Status

Implemented as the current baseline. Keep this file as the regression checklist before starting V2.

## Goal

Build a working Chrome Extension and NestJS backend that can detect or accept a Polymarket wallet address, sync historical wallet data through backend workers, reconstruct positions, and display overview metrics, trades, positions, and PnL charts.

## Non-Goals

- No auto-trading.
- No copy execution.
- No user accounts.
- No rankings, screener, alerts, copy simulator, whale analytics, or institutional analytics.

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

## Known Follow-Up Risks

- Polymarket Data/Gamma/CLOB response shapes must be tested against several real wallets.
- CLOB token id mapping may need refinement beyond the V1 condition-id fallback.
- Extension bundle is large because ECharts is bundled eagerly.

