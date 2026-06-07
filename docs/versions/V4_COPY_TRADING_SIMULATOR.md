# Version 4: Copy Trading Simulator

## Goal

Replay historical wallet trades to estimate how a copy-trading strategy would have performed with configurable risk controls.

## Critical Boundary

This is a historical simulator only. It must not execute trades, place orders, sign transactions, or integrate private keys.

## Start Gate

Do not start V4 until V3 is implemented and verified.

## Simulator Inputs

- Starting balance
- Copy percentage
- Max position size
- Min position size
- Delay
- Only whale trades
- Liquidity filter

Validate all inputs with Zod.

## Backend Scope

Add simulation engine in `packages/analytics`:

- Historical trade replay
- Virtual cash balance
- Virtual positions
- Copy sizing
- Delay handling
- Position size limits
- Whale-only filter
- Liquidity filter placeholder for V1 simulator compatibility
- Equity curve
- Simulated PnL
- Simulated ROI
- Simulated winrate
- Simulated drawdown

Use Decimal.js for every money calculation.

## Database Changes

Use existing `CopySimulation`:

- `walletAddress`
- `settingsJson`
- `resultJson`

Add timestamps or status fields if simulations become async.

## API Changes

Add endpoints:

- `POST /wallets/:address/copy-simulations`
- `GET /wallets/:address/copy-simulations`
- `GET /wallets/:address/copy-simulations/:id`

For expensive simulations, use BullMQ and return job status.

## Extension Scope

Add simulator UI:

- Settings form
- Run simulation button
- Result summary
- Equity curve
- Simulated trade table
- Drawdown chart

## Tests

Unit tests:

- Position sizing
- Delay replay
- Min/max position filters
- Whale-only filter
- Equity curve
- Drawdown

API tests:

- Input validation
- Simulation persistence
- Result retrieval

## Done Criteria

- Simulator never performs live trading actions.
- All calculations are backend-only.
- Tests, typecheck, build pass.

