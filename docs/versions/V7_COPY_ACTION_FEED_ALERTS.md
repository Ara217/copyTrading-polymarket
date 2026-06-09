# Version 7: Copy Action Feed And Alerts

## Goal

Show wallet actions that may be worth manually copying now, and notify users when watched or high-ranking wallets take relevant actions.

This version turns analysis into an operating workflow:

- What did the trader do?
- Is it entry, add, reduce, or close?
- Is it still copyable at current conditions?
- What risk warnings apply?
- What size would be reasonable under my settings?

## Critical Boundary

Alerts and action feed items are informational only. The app must not execute trades, place orders, sign transactions, custody funds, store private keys, or automate live trading.

## Start Gate

Do not start V7 until V6 screener is implemented and verified.

## Action Feed Events

Generate events for:

- Watched wallet entered market.
- Watched wallet added to position.
- Watched wallet reduced position.
- Watched wallet closed position.
- High-ranking wallet entered market.
- High-ranking wallet made oversized trade.
- Multiple watched wallets entered same market/outcome.

## Action Context

Each action feed item should include:

- Wallet address.
- Wallet copyability score.
- Market title.
- Outcome.
- Side.
- Position effect: entry, add, reduce, close.
- Price.
- Size.
- Trade value.
- Timestamp.
- Transaction hash.
- Related current position.
- Suggested copy size based on user settings.
- Risk warnings.
- Data confidence.
- Link to Polymarket market when available.

## Delivery Channels

- Browser notifications.
- Telegram.
- Discord.
- Email.

## Backend Scope

Add `AlertWorker` with BullMQ.

Implement:

- Action event generation.
- Copyability context enrichment.
- Suggested copy-size calculation.
- Alert rule evaluation.
- Deduplication.
- Delivery status tracking.
- Provider-specific delivery adapters.

Secrets must come from environment variables only.

## Database Changes

Add models:

- `WatchlistWallet`
- `CopyActionEvent`
- `AlertRule`
- `AlertEvent`
- `NotificationDelivery`

Recommended fields:

- rule config JSON
- channel
- destination metadata
- delivery status
- dedupe key
- timestamps
- risk/warning JSON

## API Changes

Add endpoints:

- `GET /copy-actions`
- `POST /watchlist/wallets`
- `GET /watchlist/wallets`
- `DELETE /watchlist/wallets/:walletAddress`
- `POST /alerts/rules`
- `GET /alerts/rules`
- `PATCH /alerts/rules/:id`
- `DELETE /alerts/rules/:id`
- `GET /alerts/events`

## Extension And Web Scope

Add action workflow views:

- Copy action feed.
- Watchlist.
- Rule list.
- Create/edit alert rule.
- Recent alert events.
- Browser notification permission prompt.

Each action should be reviewable without leaving the table: market, outcome, side, suggested size, risk, and link out.

## Security Requirements

- Never store provider tokens in source.
- Redact destinations in logs when needed.
- Validate webhook URLs.
- Add rate limits before any public deployment.
- Do not add transaction signing or order placement.

## Tests

Unit tests:

- Action event generation.
- Position effect mapping.
- Suggested copy-size calculation.
- Rule matching.
- Deduplication.
- Channel payload builders.

Integration tests:

- Watchlist CRUD.
- Alert rule CRUD.
- Alert event generation.
- Action feed pagination.

## Done Criteria

- Action feed is backend-generated.
- Alerts include copy context and risk indicators.
- Delivery adapters are isolated and testable.
- No live trading capability is introduced.
- Tests, typecheck, and build pass.
