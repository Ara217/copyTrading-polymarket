# Implementation Roadmap

## Version 1: Minimum Viable Wallet Analyzer

Detailed spec: `docs/versions/V1_WALLET_ANALYZER.md`

1. Create monorepo, Docker Compose, TypeScript config, and env templates.
2. Create Prisma schema for Wallet, Market, Trade, Position, WalletMetrics, CopySimulation, and SyncJob.
3. Implement shared Zod schemas and wallet validation.
4. Implement Decimal.js analytics package with position reconstruction, wallet metrics, and PnL chart generation.
5. Implement NestJS API, Prisma service, Redis cache, BullMQ queue, worker, and Polymarket adapters.
6. Implement Chrome extension UI for wallet detection, manual search, overview, trades, positions, and charts.
7. Add tests for analytics and API validation.

## Later Versions

- V2: Advanced performance analytics. See `docs/versions/V2_PERFORMANCE_ANALYTICS.md`.
- V3: Whale analytics. See `docs/versions/V3_WHALE_ANALYTICS.md`.
- V4: Copy trading simulator. See `docs/versions/V4_COPY_TRADING_SIMULATOR.md`.
- V5: Wallet ranking. See `docs/versions/V5_WALLET_RANKING.md`.
- V6: Wallet screener. See `docs/versions/V6_WALLET_SCREENER.md`.
- V7: Alert system. See `docs/versions/V7_ALERT_SYSTEM.md`.
- V8: Institutional analytics. See `docs/versions/V8_INSTITUTIONAL_ANALYTICS.md`.
