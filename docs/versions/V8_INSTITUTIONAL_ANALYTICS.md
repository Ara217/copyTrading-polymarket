# Version 8: Institutional Analytics

## Goal

Add multi-wallet comparison, correlation analysis, clustering, and advanced risk metrics.

## Start Gate

Do not start V8 until V7 is implemented and verified.

## Multi-Wallet Comparison

Compare:

- Wallet A
- Wallet B
- Wallet C

Metrics:

- PnL
- ROI
- Winrate
- Drawdown
- Whale metrics
- Activity

## Correlation Analysis

Calculate:

- Shared markets
- Shared outcomes
- Similarity score

## Cluster Analysis

Detect:

- Wallet groups
- Coordinated trading patterns

Document the assumptions. Do not overstate coordination. Treat clustering as analytical signal, not proof.

## Advanced Metrics

- Sharpe ratio
- Sortino ratio
- Volatility
- Risk adjusted return

## Backend Scope

Add analytics in `packages/analytics`:

- Wallet comparison engine
- Similarity scoring
- Shared market/outcome analysis
- Cluster candidate detection
- Risk metric calculations

## Database Changes

Prefer persisted snapshots for expensive comparisons:

- `WalletComparison`
- `WalletCluster`

Store input wallets, result JSON, and timestamps.

## API Changes

Add endpoints:

- `POST /wallet-comparisons`
- `GET /wallet-comparisons/:id`
- `POST /wallet-clusters`
- `GET /wallet-clusters/:id`

For expensive jobs, use BullMQ and return job status.

## Extension Scope

Add institutional analytics views:

- Multi-wallet comparison
- Shared markets table
- Similarity matrix
- Cluster candidates
- Advanced risk metrics

## Tests

Unit tests:

- Similarity score
- Shared market detection
- Sharpe ratio
- Sortino ratio
- Volatility
- Cluster candidate scoring

Integration tests:

- Comparison job creation and retrieval.

## Done Criteria

- Analysis is careful about uncertainty.
- No claim of coordinated trading without explicit evidence.
- Tests, typecheck, build pass.

