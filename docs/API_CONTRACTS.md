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

## V4 Copy Simulation Settings Body

`POST /wallets/:address/copy-simulations` accepts an optional JSON body validated with Zod. All fields have defaults; money values are serialized back as strings:

- `startingBalance`: default `1000`
- `copyPercentage`: fraction of the trader's trade value, `(0, 1]`, default `0.1`
- `fixedCopyAmount`: overrides `copyPercentage` when set, default `null`
- `maxPositionSize`: default `null` (unlimited)
- `minPositionSize`: default `5`
- `maxMarketExposure`: per-market cost-basis cap across outcomes, default `null`
- `maxTotalExposure`: total open cost-basis cap, default `null`
- `delaySeconds`: integer `0..604800`, default `0`
- `allowedActions`: subset of `["entry", "add", "reduce", "close"]`, default all
- `includeCategories`: whitelist, default `[]` (all)
- `excludeCategories`: blacklist, default `[]`
- `includeUnresolvedMarkets`: default `true`
- `liquidityFilterEnabled`: skip copies larger than the observed trade notional, default `false`
- `excludeOversizedTrades`: default `false`
- `oversizedConfig`: `{ oversizedThreshold, topPercent, relativeMultiplier }`, default `null`
- `drawdownStopPercent`: stop opening positions after this drawdown fraction of peak equity, `(0, 1]`, default `null`

## GET `/wallets/:address/copy-sizing-suggestion`

Returns a per-wallet copy-sizing suggestion derived from the wallet's own trade-notional distribution. The UI uses it to pre-fill sensible defaults (via "Use recommended settings") so the simulator does not return "0 trades copied" on wallets whose trades are small.

```ts
type CopySizingSuggestion = {
  tradeCount: number
  medianTradeValue: string
  p25TradeValue: string
  p75TradeValue: string
  recommendedCopyPercentage: string   // e.g. "0.1"
  recommendedMinPositionSize: string  // ~p25 trade value * copy %, so most trades clear the floor
}
```

## POST `/wallets/:address/copy-simulations`

Runs a historical copy-trading simulation against the stored trade history, persists it, and returns the record. Simulations never place orders or touch funds.

```ts
type CopySimulationRecord = {
  id: string
  walletAddress: string
  createdAt: string
  settings: CopySimulationSettings
  result: {
    settings: CopySimulationSettings
    summary: {
      startingBalance: string
      endingCash: string
      openPositionValue: string
      endingEquity: string
      realizedPnl: string
      unrealizedPnl: string
      totalPnl: string
      roi: string
      winrate: string
      copiedTradeCount: number
      closedCopyTradeCount: number
      missedTradeCount: number
      missedReasonCounts: Record<string, number>
      fillMethodCounts: Record<string, number>   // counts by fill method: "actual" | "history" | "slippage"
      maxDrawdown: string
      maxDrawdownPercent: string
      drawdownStopTriggered: boolean
    }
    // Each CopySimulationLedgerRow includes `fillMethod: "actual" | "history" | "slippage"`
    ledger: CopySimulationLedgerRow[]
    missedTrades: CopySimulationMissedRow[]
    equityCurve: Array<{ date: string; cash: string; openExposure: string; equity: string }>
    categoryBreakdown: Array<{
      category: string
      copiedTradeCount: number
      missedTradeCount: number
      volume: string
      realizedPnl: string
    }>
    delaySensitivity: Array<{
      delaySeconds: number
      roi: string
      totalPnl: string
      copiedTradeCount: number
      missedTradeCount: number
    }>
  }
}
```

Missed-trade reasons: `ACTION_FILTERED`, `CATEGORY_EXCLUDED`, `UNRESOLVED_MARKET_EXCLUDED`, `OVERSIZED_TRADE`, `LIQUIDITY_FILTERED`, `DRAWDOWN_STOP`, `BELOW_MIN_SIZE`, `MAX_POSITION_SIZE`, `MAX_MARKET_EXPOSURE`, `MAX_TOTAL_EXPOSURE`, `INSUFFICIENT_BALANCE`, `NOTHING_TO_REDUCE`.

Fill methods (how each delayed copy was priced): `actual` (delay 0 — the trader's price), `history` (real CLOB midpoint interpolated to trade-time + delay), `slippage` (modeled adverse estimate when no price history is available).

## GET `/wallets/:address/copy-simulations`

Returns up to the 50 most recent stored simulations for the wallet as list items:

```ts
type CopySimulationListItem = {
  id: string
  walletAddress: string
  createdAt: string
  settings: CopySimulationSettings
  summary: CopySimulationSummary
}
```

## GET `/wallets/:address/copy-simulations/:id`

Returns a single stored simulation as a full `CopySimulationRecord`. Responds `404` when the id does not belong to the wallet.

## Wallet Identifier Resolution (V5)

Any endpoint with a `:address` segment now accepts three identifier shapes; the backend normalizes them to a `0x...` address before any downstream work:

1. Plain EVM address: `0xabc123...` (40 hex chars). Returned lowercased.
2. Polymarket profile slug: `0x<address>-<timestamp>`. The address embedded in the slug is used directly.
3. Polymarket username: e.g. `inaccuratestake`. Validated against `[a-zA-Z0-9_.-]{1,32}`, lowercased, then resolved by scraping `https://polymarket.com/profile/<username>` for the embedded `proxyWallet`. Resolved mappings are cached in Redis (24h TTL) and persisted on `Wallet.username`.

Failure shape for an unresolvable username:

```
HTTP 404
{
  "error": {
    "code": "WALLET_USERNAME_NOT_FOUND",
    "message": "No Polymarket profile resolved for username '<name>'."
  }
}
```

Invalid identifiers (none of the three shapes matched) respond `400 BadRequestException` with `"Invalid wallet address, profile slug, or username"`.

`WalletOverview` already exposes `username` and `profileImage` on the response payload; both populate from the resolved profile data.

## GET `/wallets/:address/ranking` (V5)

Returns the persisted copyability score for a single wallet.

```ts
type WalletRankingDto = {
  walletAddress: string
  finalScore: number  // 0–100
  classification:
    | "Prime copy candidate"
    | "Strong copy candidate"
    | "Watchlist candidate"
    | "High-risk candidate"
    | "Avoid copying"
  components: {
    simulatedRoi: { score: number | null, weight: number, detail?: string }
    drawdown: ...
    consistency: ...
    recentPerformance: ...
    liquidity: ...
    dataConfidence: ...
    activity: ...
    delayTolerance: ...
    oversizedRisk: ...
    categoryFocus: ...
  }
  warnings: Array<{ code: string, severity: "info" | "warning" | "critical", message: string }>
  weightsVersion: string  // e.g. "v5.1-2026-06-19"
  profile: { copyBalance, maxPositionSize, delaySeconds, includedCategories }
  updatedAt: string
}
```

404 when `WalletRanking` has not been computed yet — the client should refresh the wallet first.

Cache: 15 minutes in Redis (`ranking:wallet:<addr>:default`).

## GET `/rankings/wallets` (V5)

Paginated leaderboard of persisted rankings.

Query schema (`rankingLeaderboardQuerySchema` in `@polyand/shared`):

- `page` (int ≥ 1, default 1)
- `pageSize` (int 1–100, default 25)
- `sort` (`finalScore` | `simulatedRoiScore` | `recentPerformanceScore`, default `finalScore`) — always sorted descending
- `classification` (optional, exact match)
- `minScore` (optional, 0–100)

Response data items extend `WalletRankingDto` with:

- `totalPnl` (string)
- `roi` (string)
- `tradeCount` (number)
- `lastSyncedAt` (string | null)

Meta echoes `{ page, pageSize, total, sort }`. Cache: 15 minutes keyed by all query inputs.

Reading the leaderboard also schedules a BullMQ stale-sweep: persisted rankings older than 6 hours have their wallet re-enqueued for `refreshWallet` (rate-limited per call). No client-visible behavior change beyond eventual freshness.

## `PositionRow` extensions (V5)

In addition to the V1–V4 fields, `PositionRow` now exposes:

- `eventId: string | null` — Polymarket event grouping (gamma + `/positions` snapshot).
- `eventSlug: string | null`
- `negativeRisk: boolean | null` — neg-risk multi-outcome market flag.
- `redeemable: boolean | null` — settled position with unclaimed payout.
- `mergeable: boolean | null` — has offsetting opposite-side shares.
- `curPrice: string | null` — preferred over CLOB `/book` when present.
- `snapshotSource: "snapshot" | "reconstruction" | "snapshot-redemption" | null` — provenance flag.
- `snapshotAt: string | null` — when the snapshot cross-check matched this row.
