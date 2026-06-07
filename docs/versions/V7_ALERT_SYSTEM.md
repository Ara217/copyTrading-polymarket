# Version 7: Alert System

## Goal

Generate notifications for significant wallet and market events.

## Start Gate

Do not start V7 until V6 is implemented and verified.

## Alert Types

- Whale opened position
- Whale closed position
- New elite wallet
- Wallet entered market
- Wallet exited market

## Delivery Channels

- Browser notifications
- Telegram
- Discord
- Email

## Backend Scope

Add `AlertWorker` with BullMQ.

Implement:

- Alert rule evaluation
- Event generation
- Deduplication
- Delivery status tracking
- Provider-specific delivery adapters

Secrets must come from environment variables only.

## Database Changes

Add models:

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

## API Changes

Add endpoints:

- `POST /alerts/rules`
- `GET /alerts/rules`
- `PATCH /alerts/rules/:id`
- `DELETE /alerts/rules/:id`
- `GET /alerts/events`

## Extension Scope

Add alerts page:

- Rule list
- Create/edit alert rule
- Recent alert events
- Browser notification permission prompt

## Security Requirements

- Never store provider tokens in source.
- Redact destinations in logs when needed.
- Validate webhook URLs.
- Add rate limits before any public deployment.

## Tests

Unit tests:

- Rule matching
- Deduplication
- Channel payload builders

Integration tests:

- Alert rule CRUD
- Alert event generation

## Done Criteria

- Alert generation is backend-only.
- Delivery adapters are isolated and testable.
- Tests, typecheck, build pass.

