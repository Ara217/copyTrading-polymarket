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
