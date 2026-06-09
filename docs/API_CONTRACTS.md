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
