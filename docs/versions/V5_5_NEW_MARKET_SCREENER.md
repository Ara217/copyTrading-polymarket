# Version 5.5: New Market Screener

## Goal

Surface brand-new Polymarket markets during their earliest, thinnest-liquidity window — before real price discovery finishes — so the user can manually evaluate early entries.

Rationale: new markets open with a placeholder `0.5/0.5` price and an empty order book. For minutes (short-dated games) to hours (long-dated season/tournament markets) prices can sit far from fair value. The screener's job is to win the user that time window. The judgment of whether a price is wrong stays with the user.

This is a market-discovery module. It is independent of wallet analytics: it does not read wallets, trades, positions, rankings, or simulations.

## Placement

Executed between V5 (done) and V6 (Copy Candidate Screener). No V1–V5 artifact is an input, and V6–V8 do not depend on it. V7 (alerts) may later reuse the discovery poller as an alert source; design the poller so that reuse is possible but do not build alert delivery now.

## Start Gate

- V5 done criteria pass (already met).
- Do not delay V6 for this module beyond its own scope; it is deliberately small.

## Non-Goals

- No order placement, signing, custody, or auto-trading (project-wide rule).
- No fair-odds comparison against sportsbooks or external models (documented follow-up, V5.5.x).
- No push/email alerts (V7 territory).
- No wallet-level analysis of who trades the new markets.

## Upstream APIs

All endpoints are public and unauthenticated.

### Gamma API (discovery)

`GET https://gamma-api.polymarket.com/events?closed=false&order=createdAt&ascending=false&limit=<n>&tag_id=<id>&related_tags=true`

Verified behavior (2026-07-02):

- `createdAt` is present on events and markets and sorts newest-first with `order=createdAt&ascending=false`.
- Events embed their `markets[]`, each with `question`, `slug`, `conditionId`, `clobTokenIds`, `outcomes`, `outcomePrices`, `liquidity`, `volume`, `acceptingOrders`, `acceptingOrdersTimestamp`, `startDate`, `endDate`.
- New markets report `outcomePrices: ["0.5","0.5"]` and `liquidity: null` until the first real orders arrive. This placeholder state is the "no price yet" signal.
- The public site links by **event slug** (`polymarket.com/event/<event.slug>`), not market slug. One event holds many markets (e.g. a "League Champion" event contains one market per team); the screener must group by event to avoid duplicate rows.
- Category comes from Gamma tags (`tag_id` filter; e.g. Sports = 1). Persist the tag list per event.

Validate every upstream response with Zod. Unknown/extra fields must be ignored, not fatal.

### CLOB API (price state)

`GET https://clob.polymarket.com/book?token_id=<clobTokenId>` — first non-empty `bids`/`asks` marks the start of real price discovery.

Batch variants (`POST /books`, `/prices`, `/midpoints`) exist and should be used when polling many tracked markets in one job run. Prefer Gamma's `outcomePrices`/`liquidity` when they are already populated; hit CLOB only for markets still in the placeholder state (Gamma lags the book by minutes for brand-new markets).

## Market Lifecycle States

The tracker assigns each discovered market one state:

- `CREATED` — event exists, `acceptingOrders` false or missing.
- `BOOK_EMPTY` — accepting orders, but order book empty / prices at placeholder `0.5` with null liquidity. Earliest possible entry; no trade can fill yet unless the user posts a resting order.
- `DISCOVERY` — first liquidity present; price has moved off the placeholder, volume below the settled threshold. This is the actionable window.
- `PRICED` — volume ≥ `SETTLED_VOLUME_USD` (default 500, configurable) **or** age ≥ `SETTLED_AGE_HOURS` (default 24). Easy window considered closed; row drops out of the default feed but stays queryable.
- `CLOSED` — market closed/resolved upstream.

State transitions are computed server-side on each poll and persisted, including the timestamp of first observed liquidity (`firstLiquidityAt`) and the first observed non-placeholder price (`openingPrice`) per outcome — these two values are the whole point of the dataset and must never be overwritten once set.

## Backend Scope

### Discovery job (BullMQ)

New repeatable queue job `market-discovery` (reuse the existing BullMQ setup):

- Runs every 60 seconds (configurable via env `MARKET_DISCOVERY_INTERVAL_MS`).
- Fetches newest events per configured category tag (`MARKET_DISCOVERY_TAG_IDS`, default: sports, politics, crypto, pop-culture) with `limit=50`.
- Upserts unseen events + markets. Idempotent: re-seeing an event only updates mutable fields.
- Cursor optimization: stop paging when reaching an already-known `createdAt`.

### Tracking job (BullMQ)

New repeatable queue job `market-price-tracking`:

- Runs every 60 seconds over all tracked markets not in `PRICED`/`CLOSED` state.
- Refreshes prices/liquidity/volume (Gamma first; CLOB `/books` batch for placeholder-state markets).
- Applies the state machine; stamps `firstLiquidityAt`/`openingPrice` exactly once.
- Markets transition out of active tracking on `PRICED`/`CLOSED`; a daily sweep closes anything the API reports closed.

Bound the tracked set: only markets younger than `SETTLED_AGE_HOURS` are polled. Expected steady-state is a few hundred rows; if a poll cycle exceeds the interval, log a structured warning rather than overlapping runs (BullMQ job options: no concurrent repeats).

### Module layout

New NestJS module `apps/api/src/screener/` (service, controller, queue processors) plus a Gamma adapter beside the existing Polymarket adapters (`apps/api/src/polymarket/gamma.adapter.ts`). No heavy math is involved, so nothing new is required in `packages/analytics`. Money/price values flow as strings in DTOs per project convention; internal comparisons use Decimal.js.

## Database Changes

New Prisma models (+ migration):

```prisma
model ScreenerEvent {
  id            String   @id            // gamma event id
  slug          String   @unique        // polymarket.com/event/<slug>
  title         String
  category      String                  // primary tag label
  tagsJson      Json
  createdAtGamma DateTime               // upstream createdAt
  endDate       DateTime?
  discoveredAt  DateTime @default(now())
  markets       ScreenerMarket[]
}

model ScreenerMarket {
  id               String   @id         // gamma market id
  eventId          String
  event            ScreenerEvent @relation(fields: [eventId], references: [id])
  conditionId      String
  question         String
  outcomesJson     Json                 // outcome labels
  clobTokenIdsJson Json
  state            String               // CREATED | BOOK_EMPTY | DISCOVERY | PRICED | CLOSED
  openingPricesJson Json?               // first non-placeholder price per outcome, set once
  currentPricesJson Json?
  liquidity        String?              // decimal string
  volume           String?              // decimal string
  acceptingOrdersAt DateTime?
  firstLiquidityAt DateTime?            // set once
  lastPolledAt     DateTime?
  createdAtGamma   DateTime
  updatedAt        DateTime @updatedAt

  @@index([state, createdAtGamma])
  @@index([eventId])
}
```

Existing `Market` table is untouched; screener rows are a separate, short-lived working set (prunable), while `Market` remains the wallet-analytics domain.

Retention: a scheduled cleanup deletes `ScreenerMarket`/`ScreenerEvent` rows older than `SCREENER_RETENTION_DAYS` (default 30) — with one exception: rows are kept if needed for the follow-up analysis feature (out of scope now; the retention default keeps the table small either way).

## API Changes

New endpoints (Zod-validated query params, paginated):

- `GET /screener/new-markets`
  - Query: `category?`, `state?` (default `BOOK_EMPTY,DISCOVERY`), `maxAgeHours?` (default 24), `limit?`/`cursor?`.
  - Returns event-grouped rows: event id/slug/title/category, `polymarketUrl` (`https://polymarket.com/event/<slug>`), event `createdAt`, age in minutes, and its markets with question, outcomes, state, opening prices, current prices, liquidity, volume, `firstLiquidityAt`.
  - Sorted newest-first.
- `GET /screener/new-markets/:eventId` — one event with full market detail (for a drill-down view).
- `GET /screener/meta` — available categories (tags currently polled), state counts, last poll timestamps (lets the UI show "feed is live / stale").

All prices serialized as strings.

## Redis Cache

- Cache `GET /screener/new-markets` responses for 30 seconds keyed by full query shape. The feed's freshness matters more than cache hit rate; 30s matches the poll cadence.
- Adapter-level: cache the Gamma tag list 24h.

## Extension And Web Scope

One new view in both clients: **"New Markets"** tab.

- Table grouped by event: title (links to `polymarketUrl`, opens in new tab), category badge, age ("14m ago"), state badge (`No price yet` / `Discovery` / `Priced`), per-outcome current price vs opening price, liquidity, volume.
- Filters: category, state, max age.
- Auto-refresh every 30–60s while the tab is visible (plain polling; no websockets).
- Empty state explains what the feed is and that new markets appear within ~1 minute of creation.
- Clients render only; all state computation is server-side (architecture boundary).

## Tests

Unit:

- Gamma adapter: schema validation, event/market mapping, placeholder-price detection (`["0.5","0.5"]` + null liquidity), tag → category mapping, pagination cursor stop.
- State machine: every transition, including "opening price and `firstLiquidityAt` are written exactly once" and "volume/age thresholds move `DISCOVERY → PRICED`".
- CLOB book adapter: empty vs non-empty book classification.

Integration (API):

- `GET /screener/new-markets` filter/pagination validation (bad category, bad state, limit bounds → 400).
- Event grouping: an event with 9 markets returns one event row with 9 markets, one URL.
- Meta endpoint reports poll staleness.

## Config

New env vars (documented in `.env.example`): `MARKET_DISCOVERY_INTERVAL_MS`, `MARKET_DISCOVERY_TAG_IDS`, `SETTLED_VOLUME_USD`, `SETTLED_AGE_HOURS`, `SCREENER_RETENTION_DAYS`.

## Follow-Ups (out of scope, documented for the roadmap)

- **V5.5.x fair-value context**: attach an external fair-probability reference (sportsbook odds for games; user-entered estimate otherwise) so the feed can show "opening price vs fair" instead of price alone. This is the piece that turns discovery into a statistically defensible strategy; deferred because it requires a paid/limited odds source.
- **V7 integration**: emit `market.discovered` / `market.first-liquidity` events onto the alert bus when V7 lands.

## Done Criteria

- Discovery and tracking jobs run on schedule; a market created on Polymarket appears in `GET /screener/new-markets` within 2 poll cycles.
- Placeholder-price markets are classified `BOOK_EMPTY`; first liquidity flips them to `DISCOVERY` and permanently records `openingPrice` + `firstLiquidityAt`.
- Feed rows are event-grouped with working `polymarket.com/event/<slug>` links (no duplicate event rows).
- Retention sweep keeps the working set bounded.
- Web and extension render the New Markets tab from the API only.
- Docs updated: `ROADMAP.md`, `API_CONTRACTS.md` (new endpoints), `DECISIONS.md` (state thresholds, Gamma-first/CLOB-fallback polling decision).
- Tests, typecheck, and build pass.
