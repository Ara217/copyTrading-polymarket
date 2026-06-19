# Critical Decisions

These notes are the source of truth for future refreshes and continuation runs.

## V1 Scope

- Build only Version 1 before moving to advanced analytics.
- Product is a copy-trading intelligence platform, not a trading bot and not an auto-trading system.
- The platform helps users discover, validate, monitor, and manually copy successful Polymarket traders.
- No authentication in V1; this is a local/private analytics tool.
- Chrome extension owns UI, charts, tables, search, and wallet detection only.
- Backend owns all analytics, position reconstruction, PnL, queueing, persistence, and API integration.

## Development And Deployment

- Use a local-first Docker Compose setup for PostgreSQL and Redis.
- Keep Railway compatibility from day one via `Dockerfile`, `railway.json`, and env-based configuration.
- Use `npm workspaces`.
- Backend API listens on port `3000`.
- Chrome extension uses `VITE_API_BASE_URL`; default development URL is `http://localhost:3000`.

## Wallet Detection

- V1 supports Polymarket profile/user pages, any URL containing a `0x...` wallet address, and manual wallet input.
- Wallet input is validated as either an EVM address or a Polymarket profile slug before calling the API.
- Polymarket profile slugs can look like `0x...-1773916108628`. The backend keeps the slug valid as input, then analyzes the embedded `0x...` address. Do not scrape `/profile/{slug}` to substitute another wallet: Playwright network traces showed Polymarket profile pages call Data API with the embedded URL address for `user`, `proxyAddress`, and `user_address`.

## Refresh Architecture

- Wallet refresh always uses BullMQ.
- `POST /api/v1/wallets/:address/refresh` returns `jobId` and job status.
- Worker syncs wallet, trades, markets, positions, and metrics.
- Gamma market lookups are batched at 50 condition IDs per request to avoid HTTP `414 URI Too Long` on high-activity wallets.
- Worker failures must mark both the concrete BullMQ job and the `wallet:{address}:latest` status as `failed`.

## Market Pricing

- Unresolved markets use CLOB midpoint when available.
- Fallback order is midpoint, best bid/ask depending on exit direction, last trade price, then last known stored price.
- Resolved markets pay `1.00` for the winning outcome and `0.00` for losing outcomes.
- CLOB `/book` is keyed by the ERC1155 **token id** (`asset` in the Data API trade payload), not the `conditionId`. We capture and persist `Trade.tokenId` at ingestion (`apps/api/prisma/migrations/20260615050000_trade_token_id`). Pre-V5 rows were one-shot backfilled from `rawJson.asset` via `apps/api/scripts/backfill-trade-token-id.ts`.
- Snapshots returned from `PolymarketService.getPriceSnapshots` carry a `markedToMarket: boolean` flag. `true` means a live CLOB midpoint, a CLOB-confirmed resolution, or gamma-confirmed resolution drove the price; `false` means we fell back to the last fill (logged as a warning).
- When CLOB `/book` returns no bids/asks AND gamma hasn't flagged the market as resolved, the snapshot pipeline probes CLOB `/markets/<conditionId>` (`ClobClient.getMarketResolution`). That endpoint exposes `closed` and per-token `winner`/`price` immediately on settlement — often hours before gamma. If `closed:true` with a winner, we mark the position at the resolution price (0 or 1) and set `markedToMarket=true`. This was added because gamma routinely lags CLOB on freshly-resolved markets (verified on `fifwc-nld-jpn-2026-06-14-nld` — gamma reported no resolution while CLOB already had `tokens[].winner=true`).
- Making `unrealizedPnl` nullable end-to-end (DTOs, Prisma, UI) so the UI can render "—" for the residual fallback cases remains a deferred follow-up.
- Past incident (V5 prep): the CLOB call previously passed `conditionId` as `token_id`, so every lookup returned no data and unrealized PnL silently fell back to entry price (always ≈ 0). Fixed by threading `tokenId` through `NormalizedTrade` and the snapshot path. Future analogous code MUST distinguish `marketId/conditionId` from `tokenId/asset`.

## Data Storage

- V1 stores raw JSON directly on each domain model.
- V1 raw metadata includes `source`, `fetchedAt`, and `adapterVersion`.
- A richer raw archive table is deferred to V2 or V3.
- V1 includes a minimal market lookup cache because trade rows need market title, slug, condition id, outcome info, and resolved status.
- Wallet metrics, positions, and readiness validation are computed from the same deduped trade set that is persisted. Duplicate upstream rows with the same transaction hash, condition id, outcome, and timestamp are removed before analytics so overview counts match readiness counts.
- Data API trade sync paginates through the configured public API window. Future enhancement: investigate additional history sources or archival strategies for deeper lifetime analysis when upstream public pagination is incomplete.

## Money Math

- Never use JavaScript floating point for money calculations.
- All money, price, size, PnL, ROI, and drawdown calculations use `Decimal.js`.
- API DTOs serialize Decimal values as strings.

## V3 Copy Readiness Scoring

- Copy readiness is backend-owned decision-support evidence, not a trading signal.
- Readiness score weights are: data coverage `25%`, freshness `20%`, activity cadence `20%`, liquidity fit `20%`, and position-size fit `15%`.
- Data coverage combines stored trade count and unique market count from the configured public adapter window.
- Oversized trades are classified by three methods: absolute threshold, top-percentile notional, and relative multiplier versus average trade notional.
- Liquidity and size-fit scores use available trade notional and reconstructed position exposure as placeholders until deeper order-book/liquidity simulation is implemented.
- The copy-readiness API also returns a data-validation summary so UI users can compare synced trade count, market count, position count, oldest/latest synced activity, last sync time, source, adapter version, and public-window limitations before trusting the score.
- Category exposure uses upstream market metadata first. When Gamma/Data metadata is missing, the backend applies conservative title/slug heuristics for broad categories such as Sports, Crypto, Politics, Esports, Finance, and Culture. Unknown remains visible when neither metadata nor heuristics are reliable.
- Wallets at the current public Data API sync window are not treated as full lifetime proof. The UI should show this as a validation note and continue to treat deeper history as a future enhancement.

## V4 Copy Trading Simulator

- Simulations run synchronously inside the API request because stored histories are capped by the public Data API window; BullMQ-based async simulations stay a future option (the spec's `status`/`startedAt`/`completedAt`/`errorMessage` fields are deferred until needed).
- The simulator replays the stored trade tape only. Delay handling executes the copy at the first observed trade price in the same market and outcome at or after `traderTimestamp + delaySeconds`, falling back to the source trade price when no later trade exists.
- Copy sizing for buys is `fixedCopyAmount` when set, otherwise `traderTradeValue * copyPercentage`, then capped by max position size, max market exposure, max total exposure, and available cash. A capped value below `minPositionSize` becomes a missed trade attributed to the binding constraint.
- Sells mirror the trader proportionally: if the trader closes 40% of their position, the copier closes 40% of theirs. Sells are never blocked by category, liquidity, oversized, or drawdown rules so positions can always wind down; only the action filter applies.
- The replay equity curve is realized-basis (`startingBalance + cumulative realized PnL`), so buys do not move equity and the drawdown stop reacts to realized losses. Final unrealized PnL marks resolved markets at 1/0; unresolved copier positions stay at cost because no per-outcome stored price is reliable enough.
- The drawdown stop only blocks new buys; reduces and closes continue after it triggers.
- The liquidity filter is a placeholder per the spec: a copy larger than the observed trade notional is treated as unfillable and missed with `LIQUIDITY_FILTERED`.
- Each simulation persists `settingsJson` and `resultJson` to the existing `CopySimulation` table; no schema migration was required. The list endpoint returns the latest 50.
- Delay sensitivity is computed server-side by re-running the simulation at 0s, 1m, 5m, 15m, and 1h and is embedded in the stored result.

## V4 Delay Fill Pricing (price history)

- Delayed copy fills are priced by a strategy chain recorded per ledger row as `fillMethod`:
  1. `actual` — at delay 0 the copier fills at the trader's own price.
  2. `history` — with delay, interpolate the market's real CLOB midpoint timeseries to `tradeTime + delay`.
  3. `slippage` — when no price history is available for that market, apply a modeled adverse drift (`DELAY_SLIPPAGE_PER_MINUTE = 0.1%/min`, clamped to (0,1)). This is an estimate, never presented as a real fill.
- This replaces the earlier "next observed trade in the same market" approximation, which made delay sensitivity coarse and non-monotonic (it snapped to the trader's own re-trades).
- Price history comes from the CLOB `/prices-history?market=<tokenId>&interval=max&fidelity=10` endpoint, keyed by the outcome token id (`asset`) already stored in each trade's `rawJson` — no schema change.
- Fetching is on-demand at simulation time with a Redis cache (`clob:price-history:<token>`, TTL 1h), bounded to `maxPriceHistoryTokens = 300` per simulation ordered by most recent activity, fetched with concurrency 8. The same fetched histories are reused across the main run and the five delay-sensitivity runs. Markets beyond the cap (or lacking history) fall back to the slippage estimate; the `summary.fillMethodCounts` split makes coverage explicit.
- Redis is the same instance BullMQ already uses, so this adds no new infrastructure. Cache misses cost one CLOB call per token (first simulation of a wallet); warm runs read from cache.

## CLOB API Scope

- CLOB read endpoints are adopted per-version when a feature requires them, never speculatively.
- Currently used: `/book` (unresolved-position valuation) and `/prices-history` (V4 delayed-fill pricing, on-demand + Redis-cached).
- Planned: `/book` depth + `/spread` for real liquidity scoring (V5) and a non-placeholder V4 liquidity filter; `/midpoint`/`/price`/`/spread` and their batch variants for live alert context (V7/V8).
- Permanent boundary: CLOB order/authenticated endpoints (`/order`, signing, allowances) are never used. The platform is decision-support only — no order placement, key handling, or live execution. See `docs/ARCHITECTURE.md` ("CLOB API Usage And Roadmap") for the full endpoint map.

## V4 Copy Sizing UX (Problem 2)

- Default sizing (copy 10%, min $5) skips trades whose copied value falls below the floor; on small-size wallets this yields "0 trades copied" and the matching sells cascade to `NOTHING_TO_REDUCE`, which reads as breakage.
- Mitigations: (A) the results panel shows an empty-state explanation when `copiedTradeCount === 0`, derived from the dominant blocking `missedReasonCounts` (ignoring `NOTHING_TO_REDUCE`, a downstream effect); (B) `GET /wallets/:address/copy-sizing-suggestion` exposes the wallet's trade-notional distribution and a recommended copy %/min size (min ≈ p25 trade value × copy %, so ~75% of trades clear the floor), surfaced via a "Use recommended settings" action.
- Deferred (optional V4.x): balance-anchored sizing mode (fraction of the user's balance per copy rather than the trader's notional). More realistic, but not needed once A+B remove the confusion. Recorded in `docs/ROADMAP.md`.

## V5 Positions Snapshot

- `/trades`-only reconstruction silently disagrees with Polymarket's UI whenever a position closes off-CLOB (redemption, merge, neg-risk conversion, transfer). V5 introduces `/positions` as the authoritative snapshot of current state and reconciles trade replay against it inside `refreshWallet`.
- Adapter: `DataClient.getWalletPositions(address)` paginates `data-api.polymarket.com/positions?user=<addr>&sizeThreshold=0`. `sizeThreshold=0` is required so settled-but-not-redeemed rows still come back; without it the API would omit positions sitting at zero.
- Cross-check (`apps/api/src/wallets/positions-snapshot.ts:mergeReconstructionWithSnapshot`) runs after `reconstructPositions`. Precedence rules:
  1. Upstream `size === 0` (or row missing) with reconstructed shares → **redemption path**. Use upstream `realizedPnl` if present; otherwise credit `(settlementPrice × shares) − costBasis` using the winning outcome from gamma + CLOB `/markets/<id>` fallback.
  2. Upstream row present with `size > 0` but reconstruction diverges by more than tolerance → **snapshot wins**. Persist upstream `size`, `avgPrice`, `realizedPnl`; recompute `unrealizedPnl` from upstream `curPrice` when available.
  3. Within tolerance → reconstruction stands. Snapshot-only fields (`curPrice`, `currentValue`, `cashPnl`, `percentPnl`, `eventId`, `negativeRisk`, `redeemable`, `mergeable`) are still attached so downstream consumers see consistent enrichment.
  4. Upstream rows with no matching reconstruction → inserted as snapshot-only positions with `confidenceScore = 70` (typically positions older than the public `/trades` window).
- Tolerances: 0.5% relative on size and currentValue, 1¢ absolute on prices. Beyond tolerance triggers a structured `positions.divergence` log with both sides of the delta.
- Snapshot failure (network, schema mismatch) does not break refresh: the adapter call is wrapped in `.catch(() => [])` and the merge collapses to pure reconstruction. A `positions.snapshot.failed` log captures the failure.
- Market enrichment: `eventId` and `eventSlug` are pulled from gamma `/markets` when present and back-filled from `/positions` rows when gamma lacks them. Persisted on `Market` to support V6 event-grouped filters and V8 portfolio correlation.
- Position-level columns added: `Position.eventId`, `negativeRisk`, `redeemable`, `mergeable`, `curPrice`, `currentValue`, `cashPnl`, `percentPnl`, `snapshotSource`, `snapshotAt`. All nullable so pre-V5 rows remain valid; one-shot backfill: `apps/api/scripts/backfill-positions-snapshot.ts` re-runs `refreshWallet` per persisted wallet.
- Upstream `curPrice` is preferred over per-market CLOB `/book` lookups; CLOB `/book` and `/markets/<id>` resolution remain fallbacks for positions outside the snapshot.

## V5 Ranking Weights

- Weights are locked in `packages/analytics/src/ranking.ts:DEFAULT_WEIGHTS` and versioned via `WEIGHTS_VERSION` (`v5.1-2026-06-19`). Any change to weights or scoring functions MUST bump the version so persisted `WalletRanking` rows stay traceable.
- Component weights total 100:

  | Component | Weight | Source |
  |---|---:|---|
  | Simulated copy ROI | 22 | latest `CopySimulation.summary.roi` |
  | Drawdown | 15 | simulator `maxDrawdownPercent`, falls back to `WalletMetrics.maxDrawdown` |
  | Consistency | 12 | `tradeWinrate` − loss-streak penalty, capped by sample size |
  | Recent performance | 10 | trailing 30 days of `winLossChartJson` |
  | Liquidity compatibility | 10 | `WalletReadiness.liquidityScore` |
  | Data confidence | 8 | coverage + freshness + V5 snapshot-checked + sample bonus |
  | Activity cadence | 7 | `WalletReadiness.activityScore` |
  | Delay tolerance | 6 | `simulator.delaySensitivity` ROI degradation 0s → 5min |
  | Oversized-trade risk | 5 | readiness oversized count + neg-risk share of open positions |
  | Category focus | 5 | top `eventId` share of active positions (30–70% ideal) |

- **Null redistribution rule**: any component returning `null` (e.g. no simulator output) routes its weight to `dataConfidence` only. This intentionally prevents wallets with thin evidence from gaming the score by missing dimensions — instead they get rewarded only for the data-confidence axis they actually pass.
- **Forced "Avoid copying"**: regardless of weighted sum, `finalScore` is capped at 39 if `finalScore < 40` *or* `liquidity < 10` *or* `dataConfidence < 20`. A single critical failure cannot be averaged away.
- **Classification thresholds**: 90–100 prime, 80–89 strong, 60–79 watchlist, 40–59 high-risk, 0–39 avoid.
- **Warnings** surface profitable-but-uncopyable combinations (high ROI + low liquidity, high ROI + low confidence, high ROI + deep drawdown), plus thin-evidence and snapshot-unchecked tags.

## V5 Ranking Recompute Trigger

- Three layers, in this order:
  1. **Sync inside `refreshWallet`**. Inputs (metrics, readiness, latest simulator, positions snapshot) are already in memory at the end of refresh, so persisting `WalletRanking` adds no extra database round-trip beyond the row write itself.
  2. **Redis cache on read**. `GET /wallets/:address/ranking` and `GET /rankings/wallets` cache responses for 15 minutes. Cache keys include the ranking-profile inputs (`copyBalance`, `maxPositionSize`, `delaySeconds`, `includedCategories`) so different copier profiles never share a cache slot.
  3. **Stale-sweep on leaderboard read**. `GET /rankings/wallets` enqueues a BullMQ `refreshWallet` job for any persisted ranking older than 6 hours, rate-limited so a popular leaderboard query never fan-outs unbounded work. No dedicated cron until leaderboard scale justifies one.

## V5 Username Resolution

- Polymarket profiles can be addressed by username (`inaccuratestake`) in addition to the existing `0x...` address and `0x...-<timestamp>` slug. V5 accepts all three.
- Resolution mechanism: scrape `https://polymarket.com/profile/<input>` HTML for the embedded `"proxyWallet":"0x..."` token. This is the same path the V1 slug resolver already used (`polymarket.service.ts:resolveProfileSlug`). No documented JSON endpoint exists for username → address; the HTML scrape is the resolution itself, not a substitution (the input has no embedded address to override).
- Validation: usernames are validated against `polymarketUsernameSchema` (`^[a-zA-Z0-9_.-]{1,32}$`, lowercased) before any upstream fetch. Invalid inputs short-circuit without hitting Polymarket.
- Failure mode: when scraping yields no `proxyWallet`, `WalletsService.resolveWalletIdentifier` throws a `NotFoundException` with code `WALLET_USERNAME_NOT_FOUND`. The resolver MUST NEVER substitute a different wallet — this preserves the existing decision rule that profile resolution never silently changes the wallet under analysis.
- Cache: resolved usernames are written to Redis at `username:resolve:<lc-username>` with a 24-hour TTL and persisted on `Wallet.username` (already present on the schema). Subsequent lookups bypass both Redis and Polymarket once the wallet row is populated.
- Identifier pipeline order in the backend: 0x address → profile slug → username. The controller catches resolution errors and only re-wraps non-HTTP errors as `BadRequestException`, so `WALLET_USERNAME_NOT_FOUND` propagates as a 404 untouched.
