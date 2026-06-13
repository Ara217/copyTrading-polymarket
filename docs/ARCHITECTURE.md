# Polymarket Copy-Trading Intelligence Architecture

## Capability

The platform lets a local user discover, validate, monitor, and manually copy successful Polymarket traders by reconstructing wallet trade history, positions, PnL, winrate, volume, drawdown, confidence, and copyability signals from raw Polymarket API data. The first versions deliver a wallet analyzer and copy-trading decision dashboard through a Chrome extension and web UI backed by a NestJS API, PostgreSQL, Redis, and BullMQ workers.

## Non-Goals

- No trade execution.
- No custody, wallet signing, private keys, or auto-trading.
- No user accounts or team permissions in V1.
- No copy simulator, ranking, screener, action feed, alerts, or multi-wallet portfolio analytics until their planned versions.

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
  web/          Full-page React wallet dashboard
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

1. Extension detects or accepts a wallet address or Polymarket profile slug.
2. User triggers refresh.
3. API validates the identifier, resolves profile slugs to their embedded `0x...` address, and enqueues `wallet-sync`.
4. Worker fetches raw wallet trades from Polymarket adapters.
5. Worker upserts wallet, batched Gamma market metadata, trades, positions, and metrics.
6. API caches wallet overview for 15 minutes.
7. Extension and web UI read overview, trades, positions, performance, and chart data from API.

## Copy-Trading Workflow

1. Analyze a wallet's positions, trade history, and performance.
2. Confirm data quality and copy readiness.
3. Simulate copying the wallet with realistic sizing, delay, and risk limits.
4. Rank and screen wallets by copyability.
5. Watch selected wallets through action feed and alerts.
6. Manually decide whether to copy a trade on Polymarket.

The platform stops at decision support. Live execution is outside the product boundary.

## Data Quality Confidence

- `100`: trade history matches position history.
- `80`: minor discrepancy.
- `60`: missing market information.
- `40`: missing trades.
- `20`: severe inconsistency.

V1 computes confidence from data completeness and reconstruction consistency.

## V3 Readiness Validation

Copy readiness is shown with a backend-generated validation summary before any simulator work begins. The API reports the stored trade count, unique market count, reconstructed position count, oldest/latest synced trade, last sync time, source, adapter version, synced window length, category coverage, and whether the wallet appears to be capped by the current public Data API window.

Category exposure is derived from market metadata first and conservative backend title/slug heuristics second. Unknown category exposure stays visible when the app cannot classify a market reliably.

The web dashboard persists the active wallet in the `wallet` query parameter and reloads that wallet on browser refresh. Heavy analytics panels are collapsible so positions remain the primary workflow and deeper V2/V3 diagnostics are available on demand.

## CLOB API Usage And Roadmap

The Polymarket CLOB API (`https://clob.polymarket.com`) splits by whether an endpoint needs a *live* order book. This determines where each one fits.

- History endpoints work across a market's whole life, including resolved markets.
- Live endpoints (`/book`, `/midpoint`, `/price`, `/spread`) only return data for currently-open markets, so they suit "what's happening now" features, not historical analysis.

| Endpoint | Status | Use |
|---|---|---|
| `/book` (order book) | Used now | Midpoint for unresolved-position valuation at sync time. Future: real book-depth fill/slippage modeling (V4.x liquidity filter, V5 liquidity score). |
| `/prices-history` | Used now | V4 delayed-fill pricing (interpolated to trade-time + delay), keyed by the outcome token id stored in trade `rawJson`, fetched on-demand and Redis-cached. Future reuse: V5 drawdown/volatility from real prices, V7 sparklines. |
| `/midpoint`, `/price`, `/spread` | Not used | V7 live alert context (current price + spread when a watched wallet acts); spread is also a V5 liquidity signal. |
| `/books`, `/midpoints`, `/prices` (batch) | Not used | V7/V8 at scale — one batch call instead of N singles when checking many watched markets. |
| `/order`, `/orders`, signing, allowances (auth) | Out of scope permanently | Live trading. Hard product boundary: no order placement, no private keys, no signing. |

These read endpoints are introduced per-version when a feature needs them, not speculatively. The V4 on-demand + Redis-cache pattern (`clob:price-history:<token>`) is the reusable template for the live endpoints.
