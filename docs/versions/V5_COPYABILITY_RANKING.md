# Version 5: Copyability Ranking

## Goal

Score wallets from 0-100 by how suitable they are for manual copy trading.

A profitable wallet is not automatically a good copy target. The ranking must account for whether the wallet's actions are timely, liquid, consistent, and realistic for the user's copy size.

## Start Gate

Do not start V5 until V4 simulator is implemented and verified.

## Scores

Compute score components:

- Simulated copy ROI score.
- Simulated drawdown score.
- Consistency score.
- Recent performance score.
- Liquidity compatibility score.
- Delay tolerance score.
- Activity cadence score.
- Category focus score.
- Data confidence score.
- Oversized-trade risk score.

## Classification

- `90-100`: Prime copy candidate
- `80-89`: Strong copy candidate
- `60-79`: Watchlist candidate
- `40-59`: High-risk candidate
- `0-39`: Avoid copying

## Backend Scope

Add scoring engine in `packages/analytics`:

- Normalize metric inputs.
- Include simulator output as a first-class input.
- Apply documented weights.
- Return individual score components and final score.
- Return classification label.
- Return warnings when a wallet is profitable but not realistically copyable.

Weights must be documented in `docs/DECISIONS.md`.

## Database Changes

Prefer a new `WalletRanking` model:

- `id`
- `walletAddress`
- `simulatedRoiScore`
- `drawdownScore`
- `consistencyScore`
- `recentPerformanceScore`
- `liquidityScore`
- `delayToleranceScore`
- `activityScore`
- `categoryFocusScore`
- `dataConfidenceScore`
- `oversizedRiskScore`
- `finalScore`
- `classification`
- `warningsJson`
- `updatedAt`

## API Changes

Add endpoints:

- `GET /wallets/:address/ranking`
- `GET /rankings/wallets`

Support pagination, sorting, and optional ranking profile:

- `copyBalance`
- `maxPositionSize`
- `delay`
- `includedCategories`

Validate query inputs with Zod.

## Redis Cache

Cache wallet rankings for 15 minutes.

Cache keys must include ranking profile inputs so different user assumptions do not share stale results.

## Extension And Web Scope

Add leaderboard view:

- Wallet address.
- Copyability score.
- Classification.
- Key score components.
- Recent activity.
- Simulator summary.
- Warnings.
- Last synced date.

## Tests

Unit tests:

- Score normalization.
- Weighting.
- Classification boundaries.
- Missing simulator result handling.
- Profitable-but-not-copyable warnings.

Integration tests:

- Leaderboard pagination and sorting.
- Ranking profile validation.

## Done Criteria

- Ranking is backend-only.
- Ranking is copyability-specific.
- Leaderboard is cache-backed.
- Tests, typecheck, and build pass.
