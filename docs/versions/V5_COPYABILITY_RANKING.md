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

## Positions Snapshot As Source Of Truth

V1–V4 reconstruct positions entirely from `/trades`. That reconstruction misses any closure path that bypasses CLOB fills — redemptions, merges, neg-risk conversions, transfers — and silently disagrees with Polymarket's own UI whenever those happen. V5 must close that gap because ranking inputs (drawdown, ROI, oversized-trade risk, category focus) depend on accurate current state.

Backend changes:

- Add `getWalletPositions(walletAddress)` adapter against `data-api.polymarket.com/positions` (use `sizeThreshold=0` so settled-but-not-redeemed rows appear; sweep size and pagination must be validated with Zod).
- During `refreshWallet`, treat `/trades` as the historical ledger and `/positions` as the authoritative snapshot of "now". Cross-check at the end of reconstruction:
  - When `/positions` says `size = 0` (or omits a market) for a `(conditionId, outcome)` where we reconstructed shares held, treat the delta as **redemption / merge / off-CLOB closure** and credit realized PnL using the settlement price (1 if user's outcome won, 0 if it lost, or the upstream `realizedPnl` field when present).
  - When upstream `size`, `avgPrice`, `realizedPnl`, or `currentValue` diverge from our replay by more than a small tolerance, snapshot wins on persisted state; emit a structured `positions.divergence` log so the discrepancy is observable.
- Prefer upstream `curPrice` from `/positions` over per-market CLOB `/book` calls. CLOB book and CLOB `/markets/<id>` resolution stay as fallbacks.

Database changes:

- Add `Position.eventId`, `Position.negativeRisk`, `Position.redeemable`, `Position.mergeable` (all nullable on rows synced before V5 backfill).
- Add `Market.eventId` and `Market.eventSlug` for event-level grouping.
- Backfill script populates the new fields from a one-time `/positions` sweep across known wallets.

Type / API changes:

- Extend `PositionRow` with `eventId`, `eventSlug`, `negativeRisk`, `redeemable`, `mergeable`.
- `WalletPerformance` and ranking inputs consume the cross-checked numbers; document the precedence rules in `docs/DECISIONS.md`.

Ranking implications:

- *Category Focus Score* groups by `eventId` first, slug heuristic second. A wallet with seven World Cup positions across different markets is now a real concentration signal instead of being scattered across slugs.
- *Oversized-trade risk* gets a separate lane for `negativeRisk` markets — neg-risk payouts and liquidity differ from vanilla binaries and should not be ranked on the same curve.
- *Data confidence score* gains a `snapshotChecked` dimension: wallets whose reconstruction matched `/positions` cleanly score higher than wallets whose state had to be overridden.

Tests:

- Adapter unit test covers pagination, `sizeThreshold` handling, schema validation.
- Reconstruction cross-check test: a wallet with a BUY but no SELL in `/trades` and `size=0` upstream must finish with `currentShares=0` and the redemption-credited realized PnL.
- Ranking unit test confirms `eventId`-based focus scoring beats slug-based heuristic on a mixed-event fixture.

## Username Resolution

Extend wallet identifier handling to accept Polymarket username-style profiles (e.g. `inaccuratestake`, `polymarket.com/profile/inaccuratestake`) in addition to `0x...` addresses and `0x...-<timestamp>` slugs.

Backend:

- Add a `resolveUsernameToAddress(username)` adapter in `apps/api/src/polymarket/` that calls the Polymarket profile API and returns the embedded `0x...` wallet address.
- Validate the username with Zod (allowed character set, length bounds) before calling upstream.
- Cache username → address mappings in Redis (24h) and persist on the `Wallet` row (new optional `username` column) so subsequent lookups skip the upstream call.
- Surface a clear `404` / `WALLET_USERNAME_NOT_FOUND` error when the username does not resolve.

Identifier pipeline:

- `parseWalletIdentifier` accepts: raw address → profile slug → username. Usernames must resolve to an address before any analytics query runs.
- Leaderboard, ranking, and existing V1–V4 endpoints must accept usernames in the `:address` path segment.

Update `docs/DECISIONS.md` with the resolved-username decision, the upstream endpoint used, and the failure mode (do not analyze if resolution fails — never substitute a different wallet).

Update `docs/API_CONTRACTS.md` with the username resolution contract and the new `Wallet.username` field.

## Done Criteria

- Ranking is backend-only.
- Ranking is copyability-specific.
- Leaderboard is cache-backed.
- `/positions` is integrated as snapshot source of truth: reconstruction matches Polymarket's UI on `currentShares`, `realizedPnl`, and `currentValue` after refresh; redemptions and merges no longer leave stale shares.
- `eventId` and `negativeRisk` are persisted and consumed by category focus and oversized-trade risk scoring.
- Username-style Polymarket profiles resolve to addresses and flow through every wallet endpoint.
- Tests, typecheck, and build pass.
