# Version 3: Whale Analytics

## Goal

Identify and analyze whale-sized wallet trades so users can understand whether a wallet's oversized entries are profitable or risky.

## Start Gate

Do not start V3 until V2 is implemented and verified.

## Whale Definitions

Implement all three methods:

1. Trade value greater than or equal to configured threshold.
2. Trade size in the top 10 percent for the wallet.
3. Position size relative to wallet average position size.

The backend should expose which methods marked a trade as whale.

## Backend Scope

Add analytics in `packages/analytics`:

- Whale trade classifier
- Whale count
- Whale winrate
- Whale ROI
- Largest whale win
- Largest whale loss
- Whale equity curve
- Whale profit distribution

## Database Changes

Use one of these patterns:

- Add `isWhale`, `whaleMethodsJson`, and `whaleScore` to `Trade`.
- Or create a `WhaleTrade` table if richer historical metadata is required.

Document the chosen approach in `docs/DECISIONS.md`.

## API Changes

Add endpoints:

- `GET /wallets/:address/whales`
- `GET /wallets/:address/whales/timeline`
- `GET /wallets/:address/whales/equity-curve`
- `GET /wallets/:address/whales/profit-distribution`

Support query config:

- `threshold`
- `topPercent`
- `relativeMultiplier`

Validate all inputs with Zod.

## Extension Scope

Add pages or tabs:

- Whale Entries
- Whale Timeline
- Whale Equity Curve
- Whale Profit Distribution

Show whale method badges for each whale trade.

## Tests

Unit tests:

- Threshold classifier
- Top percentile classifier
- Relative position classifier
- Whale ROI
- Whale winrate
- Largest win/loss

Integration tests:

- Whale endpoints validate config and return stable schemas.

## Done Criteria

- Whale metrics are backend-only.
- UI exposes whale entries and charts.
- Tests, typecheck, build pass.

