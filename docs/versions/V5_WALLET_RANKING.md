# Version 5: Wallet Ranking System

## Goal

Score wallets from 0-100 and classify them so users can compare wallet quality quickly.

## Start Gate

Do not start V5 until V4 is implemented and verified.

## Scores

- PnL score
- Winrate score
- Drawdown score
- Consistency score
- Whale score
- Activity score

## Classification

- `90-100`: Elite
- `80-89`: Strong
- `60-79`: Average
- `40-59`: Risky
- `0-39`: Avoid

## Backend Scope

Add scoring engine in `packages/analytics`:

- Normalize metric inputs.
- Apply weighted scoring.
- Return individual score components and final score.
- Return classification label.

Weights must be documented in `docs/DECISIONS.md`.

## Database Changes

Prefer a new `WalletRanking` model:

- `id`
- `walletAddress`
- `pnlScore`
- `winrateScore`
- `drawdownScore`
- `consistencyScore`
- `whaleScore`
- `activityScore`
- `finalScore`
- `classification`
- `updatedAt`

## API Changes

Add endpoints:

- `GET /wallets/:address/ranking`
- `GET /rankings/wallets`

Support pagination and sorting.

## Redis Cache

Cache wallet rankings for 15 minutes.

## Extension Scope

Add leaderboard view:

- Wallet address
- Score
- Classification
- Key metrics
- Last synced date

## Tests

Unit tests:

- Score normalization
- Weighting
- Classification boundaries
- Missing metric handling

Integration tests:

- Leaderboard pagination and sorting.

## Done Criteria

- Ranking is backend-only.
- Leaderboard is cache-backed.
- Tests, typecheck, build pass.

