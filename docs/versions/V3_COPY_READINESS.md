# Version 3: Copy Readiness And Risk Signals

## Goal

Decide whether a wallet has enough reliable, fresh, liquid, and interpretable data to be evaluated as a copy-trading candidate.

This version reframes the old whale-analytics idea as one part of copy readiness. Oversized trades matter because they can make a wallet hard or risky to copy, but the primary goal is not to admire whale activity. The primary goal is to answer: "Can this wallet be copied safely enough to simulate?"

## Critical Boundary

This app remains a manual decision-support tool. It must not execute trades, place orders, sign transactions, store private keys, or automate live trading.

## Start Gate

Do not start V3 until V2 is implemented and verified.

## Copy Readiness Dimensions

Compute backend-owned indicators for:

- Data freshness: latest synced activity and age of data.
- Data coverage: how much usable trade history is available from the configured adapters.
- Activity level: trades per day/week and idle periods.
- Market status mix: open, closed, resolved, and unknown markets.
- Liquidity compatibility: whether recent trades are realistically copyable at expected size.
- Position size compatibility: whether wallet position sizes are too large or too small for the user's copy settings.
- Category focus: sports, crypto, politics, esports, finance, culture, or unknown.
- Oversized trade risk: whale-style entries that could distort performance or be hard to copy.
- Reconstruction confidence: whether positions and trade history reconcile cleanly.

## Backend Scope

Add analytics in `packages/analytics`:

- Copy readiness score.
- Data coverage indicator.
- Freshness indicator.
- Activity cadence metrics.
- Category exposure summary.
- Liquidity-risk placeholder using available trade size/price data.
- Oversized trade classifier.
- Oversized trade count, ROI, winrate, largest win, and largest loss.

Use Decimal.js for every money calculation.

## Database Changes

Prefer extending persisted wallet metrics or adding a `WalletReadiness` model if the result becomes large:

- `walletAddress`
- `readinessScore`
- `dataCoverageScore`
- `freshnessScore`
- `activityScore`
- `liquidityScore`
- `positionSizeScore`
- `categoryExposureJson`
- `oversizedTradeSummaryJson`
- `warningsJson`
- `updatedAt`

Document any scoring weights in `docs/DECISIONS.md`.

## API Changes

Add endpoints:

- `GET /wallets/:address/copy-readiness`
- `GET /wallets/:address/category-exposure`
- `GET /wallets/:address/oversized-trades`

Support query config:

- `copyBalance`
- `maxPositionSize`
- `minPositionSize`
- `oversizedThreshold`
- `topPercent`
- `relativeMultiplier`

Validate all inputs with Zod.

## Extension And Web Scope

Add copy-readiness sections:

- Readiness score with clear warnings.
- Data freshness and coverage indicator.
- Activity cadence.
- Category exposure.
- Liquidity/position-size compatibility.
- Oversized trade table with method badges.

The UI should make weak data visible without overemphasizing any single upstream limitation. If additional historical data sources become available, adapters can expand coverage later.

## Future Enhancement

Investigate additional Polymarket history sources or archive strategies for wallets whose public Data API history is incomplete for lifetime analysis.

## Tests

Unit tests:

- Freshness score.
- Activity cadence.
- Category exposure aggregation.
- Oversized trade classifiers.
- Readiness score weighting.
- Warning generation.

Integration tests:

- Readiness endpoint validation.
- Stable response shape for wallets with low, medium, and high data coverage.

## Done Criteria

- Copy readiness is computed on the backend.
- UI clearly shows whether a wallet is ready for simulation.
- Oversized-trade analytics are presented as risk context.
- Tests, typecheck, and build pass.
