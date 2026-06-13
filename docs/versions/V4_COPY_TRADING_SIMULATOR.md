# Version 4: Copy Trading Simulator

## Goal

Replay historical wallet actions to estimate whether manually copying a trader would have worked under realistic user settings.

This version is the main proof step before ranking or alerts. It should answer:

- Would copying this wallet have made money?
- How sensitive is performance to delay?
- What copy size is realistic?
- What drawdown would the copier experience?
- Which markets or categories should be excluded?

## Critical Boundary

This is a historical simulator only. It must not execute trades, place orders, sign transactions, store private keys, or automate live trading.

## Start Gate

Do not start V4 until V3 copy-readiness indicators are implemented and verified.

## Simulator Inputs

Validate all inputs with Zod:

- Starting balance.
- Copy percentage.
- Fixed copy amount.
- Max position size.
- Min position size.
- Max market exposure.
- Max total open exposure.
- Delay in seconds/minutes.
- Entry-only, add-only, reduce-only, close-only, or all actions.
- Include/exclude categories.
- Include/exclude unresolved markets.
- Liquidity filter.
- Oversized-trade filter.
- Stop copying after drawdown threshold.

## Backend Scope

Add simulation engine in `packages/analytics`:

- Historical trade replay.
- Virtual cash balance.
- Virtual positions.
- Copy sizing.
- Delay handling.
- Position size limits.
- Market exposure limits.
- Category filters.
- Liquidity filter placeholder.
- Oversized-trade filter.
- Entry/add/reduce/close handling.
- Simulated trade ledger.
- Equity curve.
- Simulated PnL.
- Simulated ROI.
- Simulated winrate.
- Simulated drawdown.
- Missed-trade count and reason.

Use Decimal.js for every money calculation.

## Database Changes

Use existing `CopySimulation`:

- `walletAddress`
- `settingsJson`
- `resultJson`

Add fields if simulations become async:

- `status`
- `startedAt`
- `completedAt`
- `errorMessage`

## API Changes

Add endpoints:

- `POST /wallets/:address/copy-simulations`
- `GET /wallets/:address/copy-simulations`
- `GET /wallets/:address/copy-simulations/:id`

For expensive simulations, use BullMQ and return job status.

## Extension And Web Scope

Add simulator UI:

- Settings form.
- Run simulation button.
- Result summary.
- Equity curve.
- Simulated trade table.
- Missed-trade table.
- Drawdown chart.
- Category breakdown.
- Delay sensitivity summary.

## Tests

Unit tests:

- Position sizing.
- Delay replay.
- Min/max position filters.
- Exposure limits.
- Category filters.
- Oversized-trade filter.
- Equity curve.
- Drawdown.
- Missed-trade reason generation.

API tests:

- Input validation.
- Simulation persistence.
- Result retrieval.

## Done Criteria

- Simulator never performs live trading actions.
- All calculations are backend-only.
- Simulator output is explicit enough to decide whether a wallet is copyable.
- Tests, typecheck, and build pass.

## Implementation Status

V4 is implemented:

- Engine: `packages/analytics/src/simulator.ts` (`simulateCopyTrading`, `simulateDelaySensitivity`), unit-tested in `simulator.test.ts`.
- Validation: `copySimulationSettingsSchema` in `packages/shared`.
- API: `POST/GET /wallets/:address/copy-simulations` and `GET /wallets/:address/copy-simulations/:id` in `apps/api`, persisted to the existing `CopySimulation` table (synchronous; async/BullMQ fields deferred).
- UI: `CopySimulatorPanel` in both `apps/web` and `apps/extension` with settings form, summary, equity curve, ledger, missed trades, category breakdown, and delay sensitivity.
- See `docs/DECISIONS.md` ("V4 Copy Trading Simulator") for replay semantics and placeholders.
