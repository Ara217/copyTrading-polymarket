# Critical Decisions

These notes are the source of truth for future refreshes and continuation runs.

## V1 Scope

- Build only Version 1 before moving to advanced analytics.
- Product is an analytics platform, not a trading bot and not an auto-trading system.
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
- V1 Data API trade sync requests up to 1000 rows per wallet. The extension displays the first 100 rows and labels the trade table with the loaded count.

## Money Math

- Never use JavaScript floating point for money calculations.
- All money, price, size, PnL, ROI, and drawdown calculations use `Decimal.js`.
- API DTOs serialize Decimal values as strings.
