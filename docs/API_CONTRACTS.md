# API Contracts

Base URL: `/api/v1`

## Response Envelope

```ts
type ApiSuccess<T> = { data: T; meta?: Record<string, unknown> }
type ApiFailure = { error: { code: string; message: string; details?: unknown } }
```

## Wallet Identifier

Wallet endpoints accept either:

- EVM proxy wallet address: `0x...`
- Polymarket profile slug: `0x...-1773916108628`

When a profile slug is provided, the backend uses the embedded `0x...` address before syncing or reading analytics. Playwright verification against Polymarket profile pages showed the Polymarket UI calls Data API with the embedded URL address for `user`, `proxyAddress`, and `user_address`.

## POST `/wallets/:address/refresh`

Starts a BullMQ wallet refresh job.

Response:

```json
{
  "data": {
    "jobId": "12",
    "status": "waiting",
    "walletAddress": "0x..."
  }
}
```

## GET `/wallets/:address/overview`

Returns wallet profile, aggregate metrics, market count, and last activity.

Includes `lastSyncedAt` so clients can distinguish a wallet that has never been synced from a wallet that synced successfully but has no upstream trades.

`tradeCount` is the count of persisted normalized trade rows after sync deduplication, matching the Copy Readiness `dataValidation.tradeCount` for the same wallet snapshot.

## GET `/wallets/:address/trades`

Query params:

- `limit`: default `100`, max `500`
- `offset`: default `0`

Returns normalized trade rows with market title and transaction hash.

The extension currently requests `limit=100` for compact display. The web UI can request and display broader tables. High-activity wallets may have more stored rows in PostgreSQL because the worker paginates through the configured public Data API window.

Trade rows are enriched by the backend with reconstruction context:

- `side`: `buy` or `sell`
- `positionEffect`: `entry`, `add`, `reduce`, or `close`
- `realizedPnl`: realized PnL for sell/reduce/close rows, otherwise `0`
- `result`: `open`, `win`, `loss`, or `flat`
- `remainingShares`: shares left in that market/outcome after applying the trade
- `marketResolved`: whether the market is known resolved

Buy rows usually remain `open` because win/loss is not known until a sell/reduction or market resolution.

## GET `/wallets/:address/positions`

Returns reconstructed positions and confidence score.

Rows are ordered by latest trade activity, newest first. For closed positions this timestamp is usually the close/sell event; for open positions it is the most recent buy or sell touching that market/outcome.

Each row includes `lastTradeAt` so clients can show why the row appears in that order.

## GET `/wallets/:address/pnl-chart`

Returns daily and cumulative PnL points.

## GET `/wallets/:address/performance`

Returns V2 performance analytics computed by the backend:

- `realizedPnl`
- `unrealizedPnl`
- `totalPnl`
- `roi`
- `tradeWinrate`
- `marketWinrate`
- `resolvedMarketWinrate`
- `maxDrawdown`
- `currentDrawdown`
- `averageDrawdown`
- `longestWinStreak`
- `longestLossStreak`
- `bestTrade`
- `worstTrade`

All money and percentage values are serialized as strings.

## GET `/wallets/:address/drawdown-chart`

Returns cumulative PnL and drawdown points:

```ts
type DrawdownChartPoint = {
  date: string
  cumulativePnl: string
  drawdown: string
}
```

## GET `/wallets/:address/profit-distribution`

Returns market-level PnL bucket counts:

```ts
type ProfitDistributionBucket = {
  bucket: string
  count: number
}
```

## GET `/wallets/:address/win-loss-chart`

Returns closed-trade win/loss counts by date:

```ts
type WinLossChartPoint = {
  date: string
  wins: number
  losses: number
}
```

## V3 Copy Readiness Query Config

The V3 endpoints accept the same optional query params:

- `copyBalance`: default `1000`
- `maxPositionSize`: default `100`
- `minPositionSize`: default `5`
- `oversizedThreshold`: default `250`
- `topPercent`: default `0.05`
- `relativeMultiplier`: default `3`

All values are validated with Zod and interpreted by the backend analytics package. Clients must not duplicate scoring logic.

## GET `/wallets/:address/copy-readiness`

Returns the V3 copy-readiness result:

```ts
type CopyReadiness = {
  readinessScore: number
  dataCoverageScore: number
  freshnessScore: number
  activityScore: number
  liquidityScore: number
  positionSizeScore: number
  activityCadence: {
    activeDays: number
    observedDays: number
    tradesPerActiveDay: string
    daysSinceLastTrade: number | null
  }
  categoryExposure: CategoryExposure[]
  oversizedTrades: OversizedTrade[]
  oversizedTradeSummary: {
    count: number
    roi: string
    winrate: string
    largestWin: string
    largestLoss: string
  }
  dataValidation: {
    tradeCount: number
    marketCount: number
    positionCount: number
    oldestTradeAt: string | null
    latestTradeAt: string | null
    lastSyncedAt: string | null
    syncedWindowDays: number
    categoryCoverageRatio: string
    unknownCategoryMarketCount: number
    source: string
    adapterVersion: string | null
    coverageNote: string
    apiWindowLimited: boolean
  }
  interpretation: {
    status: "ready" | "watch" | "avoid"
    title: string
    message: string
    nextActions: string[]
  }
  warnings: Array<{ code: string; severity: "info" | "warning" | "critical"; message: string }>
  config: CopyReadinessConfig
  updatedAt: string | null
}
```

The score is decision-support evidence for whether a wallet is ready to simulate as a copy candidate. It is not a trade signal and does not execute orders.

`dataValidation` explains what data the score was built from. For high-activity wallets, `apiWindowLimited: true` means the app is analyzing the current public adapter window, not proving full Polymarket lifetime performance. `interpretation` converts the score and warnings into UI guidance for whether to avoid, watch, or simulate later.

## GET `/wallets/:address/category-exposure`

Returns category exposure extracted from available market metadata, backend title/slug fallback classification, and trade notional:

```ts
type CategoryExposure = {
  category: string
  tradeCount: number
  marketCount: number
  positionCount: number
  volume: string
  volumeShare: string
}
```

## GET `/wallets/:address/oversized-trades`

Returns trades that exceed the configured absolute, percentile, or relative oversized rules:

```ts
type OversizedTrade = {
  tradeId: string
  marketId: string
  marketTitle?: string | null
  conditionId: string
  outcome: string
  timestamp: string
  side: "buy" | "sell"
  price: string
  size: string
  value: string
  methods: Array<"threshold" | "topPercent" | "relative">
  result: "open" | "win" | "loss" | "flat"
  realizedPnl: string
}
```
