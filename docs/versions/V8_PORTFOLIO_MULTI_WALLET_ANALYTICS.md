# Version 8: Portfolio And Multi-Wallet Copy Analytics

## Goal

Help users manage risk when watching or copying multiple successful wallets.

The key question is not only "Which wallet is good?" It is also "Am I copying the same exposure through several wallets?"

## Start Gate

Do not start V8 until V7 action feed and alerts are implemented and verified.

## Multi-Wallet Comparison

Compare:

- Wallet A
- Wallet B
- Wallet C
- Saved watchlist
- Screener result set

Metrics:

- Copyability score.
- Simulated copy ROI.
- Simulated drawdown.
- Recent activity.
- Category exposure.
- Market overlap.
- Outcome overlap.
- Liquidity compatibility.
- Data confidence.

## Correlation And Overlap Analysis

Calculate:

- Shared markets.
- Shared outcomes.
- Same-side exposure.
- Opposite-side exposure.
- Shared events (group by `eventId` persisted in V5; e.g. several watched wallets all betting on the same World Cup event even across different markets).
- Category concentration.
- Similarity score.
- Copy action collision rate.

## Portfolio Risk

Estimate:

- Aggregate open exposure.
- Exposure by market.
- Exposure by event (sum `currentValue` across positions grouped by `eventId`).
- Exposure by category.
- Exposure by copied wallet.
- Max simulated drawdown across selected wallets.
- Risk-adjusted return.
- Wallet concentration.

## Cluster Analysis

Detect:

- Wallet groups with similar markets.
- Wallet groups with similar outcomes.
- Candidate duplicate-copy risk.

Document assumptions. Do not overstate coordination. Treat clustering as an analytical signal, not proof.

## Advanced Metrics

- Sharpe ratio.
- Sortino ratio.
- Volatility.
- Risk-adjusted return.
- Correlation-adjusted copyability score.

## Backend Scope

Add analytics in `packages/analytics`:

- Wallet comparison engine.
- Similarity scoring.
- Shared market/outcome analysis.
- Portfolio exposure aggregation.
- Cluster candidate detection.
- Risk metric calculations.

## Database Changes

Prefer persisted snapshots for expensive comparisons:

- `WalletComparison`
- `WalletCluster`
- `CopyPortfolioSnapshot`

Store input wallets, result JSON, and timestamps.

## API Changes

Add endpoints:

- `POST /wallet-comparisons`
- `GET /wallet-comparisons/:id`
- `POST /wallet-clusters`
- `GET /wallet-clusters/:id`
- `POST /copy-portfolios/snapshots`
- `GET /copy-portfolios/snapshots/:id`

For expensive jobs, use BullMQ and return job status.

## Extension And Web Scope

Add multi-wallet views:

- Watchlist comparison.
- Shared markets table.
- Similarity matrix.
- Category exposure chart.
- Portfolio exposure table.
- Cluster candidates.
- Advanced risk metrics.

## Tests

Unit tests:

- Similarity score.
- Shared market detection.
- Same-side and opposite-side overlap.
- Portfolio exposure aggregation.
- Sharpe ratio.
- Sortino ratio.
- Volatility.
- Cluster candidate scoring.

Integration tests:

- Comparison job creation and retrieval.
- Portfolio snapshot creation and retrieval.

## Done Criteria

- Multi-wallet analysis focuses on copy risk and exposure overlap.
- Analysis is careful about uncertainty.
- No claim of coordinated trading without explicit evidence.
- Tests, typecheck, and build pass.
