# Version 6: Wallet Screener

## Goal

Let users discover wallets by filtering analytics metrics and saving reusable filter sets.

## Start Gate

Do not start V6 until V5 is implemented and verified.

## Filters

- PnL greater than X
- ROI greater than X
- Winrate greater than X
- Drawdown less than X
- Trades greater than X
- Whale winrate greater than X

## Backend Scope

Add filter query support over persisted wallet metrics and ranking data.

All filter inputs must be validated with Zod.

## Database Changes

Add `SavedFilter` model:

- `id`
- `name`
- `filtersJson`
- `createdAt`
- `updatedAt`

No auth in this phase unless explicitly added later; saved filters are local/global.

## API Changes

Add endpoints:

- `GET /wallets/screener`
- `POST /wallets/screener/filters`
- `GET /wallets/screener/filters`
- `GET /wallets/screener/filters/:id`
- `PUT /wallets/screener/filters/:id`
- `DELETE /wallets/screener/filters/:id`

Use pagination on screener results.

## Extension Scope

Add wallet discovery page:

- Filter controls
- Results table
- Save filter
- Load filter
- Delete filter

## Tests

Unit tests:

- Filter schema validation
- Query builder logic

Integration tests:

- Screener result filtering
- Saved filter CRUD

## Done Criteria

- Filters run on backend.
- Saved filters persist in PostgreSQL.
- Tests, typecheck, build pass.

