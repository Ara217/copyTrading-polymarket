# Polymarket Analytics Platform Architecture

## Capability

The platform lets a local user analyze Polymarket wallets by reconstructing trade history, positions, real PnL, winrate, volume, and confidence from raw Polymarket API data. The first version delivers a minimum viable wallet analyzer through a Chrome extension backed by a NestJS API, PostgreSQL, Redis, and BullMQ workers.

## Non-Goals

- No trade execution.
- No custody, wallet signing, private keys, or auto-trading.
- No user accounts or team permissions in V1.
- No leaderboard, copy simulator, alerts, whale module, or institutional analytics until later versions.

## System Topology

```text
Chrome Extension
  React + Zustand + ECharts
        |
        v
NestJS API
  Zod validation + DTO envelopes
        |
        v
PostgreSQL via Prisma
        |
        v
Redis cache + BullMQ queues
        |
        v
Polymarket adapters
  GammaClient + DataClient + ClobClient
```

## Monorepo Layout

```text
apps/
  api/          NestJS API, Prisma schema, BullMQ worker
  extension/    Chrome extension MV3 UI
packages/
  analytics/    Decimal.js position reconstruction and metrics
  shared/       API schemas, wallet validation, response envelopes
  types/        Shared TypeScript DTO types
docs/           Architecture, contracts, and decision notes
```

## V1 API Contracts

All endpoints are under `/api/v1` and return `{ data }` or `{ error }`.

```text
POST /wallets/:address/refresh
GET  /wallets/:address/overview
GET  /wallets/:address/trades
GET  /wallets/:address/positions
GET  /wallets/:address/pnl-chart
```

## Data Lifecycle

1. Extension detects or accepts a wallet address.
2. User triggers refresh.
3. API validates wallet and enqueues `wallet-sync`.
4. Worker fetches raw wallet trades from Polymarket adapters.
5. Worker upserts wallet, markets, trades, positions, and metrics.
6. API caches wallet overview for 15 minutes.
7. Extension reads overview, trades, positions, and PnL chart from API.

## Data Quality Confidence

- `100`: trade history matches position history.
- `80`: minor discrepancy.
- `60`: missing market information.
- `40`: missing trades.
- `20`: severe inconsistency.

V1 computes confidence from data completeness and reconstruction consistency.

