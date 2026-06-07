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

The extension currently requests `limit=100` for display. High-activity wallets may have more stored rows in PostgreSQL because the worker syncs up to the current V1 Data API window.

## GET `/wallets/:address/positions`

Returns reconstructed positions and confidence score.

## GET `/wallets/:address/pnl-chart`

Returns daily and cumulative PnL points.
