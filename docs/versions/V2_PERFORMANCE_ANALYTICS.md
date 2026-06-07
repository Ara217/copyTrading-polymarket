# Version 2: Advanced Performance Analytics

## Goal

Extend the V1 wallet analyzer into a professional wallet analytics dashboard with realized/unrealized PnL, ROI, winrate variants, drawdown metrics, streaks, and best/worst trade analysis.

## Start Gate

Do not start V2 until V1 passes:

- Docker services are healthy.
- Prisma migration has run.
- `npm test`, `npm run typecheck`, and `npm run build` pass.
- At least two real wallet refreshes have been manually inspected.

## Backend Scope

Add analytics calculations in `packages/analytics`:

- Realized PnL
- Unrealized PnL
- Total PnL
- ROI
- Trade winrate
- Market winrate
- Resolved market winrate
- Max drawdown
- Current drawdown
- Average drawdown
- Longest win streak
- Longest loss streak
- Best trade
- Worst trade
- Profit distribution buckets
- Win/loss chart data

Use Decimal.js for every monetary and percentage calculation.

## Database Changes

Prefer extending `WalletMetrics` with V2 fields before adding new tables. Add fields only if they are persisted and used by API/UI.

Candidate fields:

- `realizedPnl`
- `unrealizedPnl`
- `roi`
- `tradeWinrate`
- `marketWinrate`
- `resolvedMarketWinrate`
- `maxDrawdown`
- `currentDrawdown`
- `averageDrawdown`
- `longestWinStreak`
- `longestLossStreak`
- `bestTradeJson`
- `worstTradeJson`
- `profitDistributionJson`
- `winLossChartJson`

Create a Prisma migration for all schema changes.

## API Changes

Add endpoints under `/api/v1`:

- `GET /wallets/:address/performance`
- `GET /wallets/:address/drawdown-chart`
- `GET /wallets/:address/profit-distribution`
- `GET /wallets/:address/win-loss-chart`

Keep the response envelope format:

```ts
{ data: T; meta?: Record<string, unknown> }
```

## Extension Scope

Add dashboard sections:

- Performance summary metrics
- Drawdown chart
- Profit distribution chart
- Win/loss chart
- Best and worst trade cards
- Streaks section

Keep dense analytics UI. Do not build a marketing page.

## Tests

Add unit tests in `packages/analytics` for:

- Realized/unrealized PnL
- ROI
- All winrate variants
- Drawdown metrics
- Streaks
- Best/worst trade
- Distribution bucket generation

Add API tests for validation and response shape.

## Done Criteria

- All V2 metrics are computed on backend only.
- Extension displays V2 data without doing heavy calculations.
- Tests, typecheck, build pass.
- `docs/API_CONTRACTS.md` and `docs/ROADMAP.md` updated.

