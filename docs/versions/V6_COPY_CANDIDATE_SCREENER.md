# Version 6: Copy Candidate Screener

## Goal

Let users discover wallets worth manually copying by filtering copy-readiness, simulator results, ranking, activity, and risk metrics.

## Start Gate

Do not start V6 until V5 copyability ranking is implemented and verified.

## Filters

Support filters for:

- Copyability score greater than X.
- Simulated ROI greater than X.
- Simulated drawdown less than X.
- Recent PnL greater than X.
- Recent activity within X hours/days.
- Minimum trade count.
- Minimum market count.
- Data confidence greater than X.
- Liquidity compatibility greater than X.
- Delay tolerance greater than X.
- Category focus.
- Open positions count.
- Oversized-trade risk less than X.
- Exclude high drawdown wallets.
- Exclude inactive wallets.

## Backend Scope

Add filter query support over persisted wallet metrics, readiness, simulator summaries, and ranking data.

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

## Extension And Web Scope

Add wallet discovery page:

- Filter controls.
- Results table.
- Save filter.
- Load filter.
- Delete filter.
- Quick actions: open wallet analysis, run simulation, add to watchlist.

## Tests

Unit tests:

- Filter schema validation.
- Query builder logic.
- Saved filter serialization.

Integration tests:

- Screener result filtering.
- Saved filter CRUD.
- Pagination and sorting.

## Done Criteria

- Filters run on backend.
- Saved filters persist in PostgreSQL.
- Screener surfaces wallets suitable for copy-trading evaluation.
- Tests, typecheck, and build pass.
