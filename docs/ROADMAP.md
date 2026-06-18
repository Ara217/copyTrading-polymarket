# Copy-Trading Intelligence Roadmap

The product goal is to help a local user discover, validate, monitor, and manually copy successful Polymarket traders. The platform is a decision-support system, not a trading bot: it must not execute trades, sign transactions, custody funds, store private keys, or automate live trading.

## Version 1: Minimum Viable Wallet Analyzer

Status: Done

Detailed spec: `docs/versions/V1_WALLET_ANALYZER.md`

1. Create monorepo, Docker Compose, TypeScript config, and env templates.
2. Create Prisma schema for Wallet, Market, Trade, Position, WalletMetrics, CopySimulation, and SyncJob.
3. Implement shared Zod schemas and wallet validation.
4. Implement Decimal.js analytics package with position reconstruction, wallet metrics, and PnL chart generation.
5. Implement NestJS API, Prisma service, Redis cache, BullMQ queue, worker, and Polymarket adapters.
6. Implement Chrome extension UI for wallet detection, manual search, overview, trades, positions, and charts.
7. Add tests for analytics and API validation.

## Version 2: Performance Analytics

Status: Done

Detailed spec: `docs/versions/V2_PERFORMANCE_ANALYTICS.md`

V2 turns raw wallet history into copy-trading-relevant performance evidence: realized/unrealized PnL, ROI, winrate variants, drawdowns, streaks, best/worst trade highlights, profit distribution, win/loss charts, and related trade drilldowns in web and extension.

## Version 3: Copy Readiness

Status: Done

Detailed spec: `docs/versions/V3_COPY_READINESS.md`

V3 validates whether a wallet is reliable enough to evaluate as a copy candidate. It adds data freshness, coverage, source/window validation, liquidity, category, market-status, and copy-readiness indicators. Whale and oversized-position signals are included as risk context, not as the primary product goal.

## Version 4: Copy Trading Simulator

Status: Done

Detailed spec: `docs/versions/V4_COPY_TRADING_SIMULATOR.md`

V4 replays historical wallet actions as a manual-copy strategy with configurable delay, copy sizing, exposure limits, category filters, liquidity filters, and cash balance. This is the first version that answers: "Would copying this wallet have worked for me?"

CLOB usage: delayed fills are priced from `/prices-history` (on-demand + Redis-cached). Optional follow-up (V4.x): replace the placeholder liquidity filter with real `/book`-depth slippage modeling. See `docs/ARCHITECTURE.md` ("CLOB API Usage And Roadmap").

Sizing UX shipped: the simulator surfaces a per-wallet recommended copy %/min size (`GET /wallets/:address/copy-sizing-suggestion`) and an empty-state explanation when no trades match. Optional follow-up (V4.x): a balance-anchored sizing mode — size each copy as a fraction of the user's own balance rather than the trader's absolute notional. This is a more realistic copy model and sidesteps small-size traders entirely; deferred because the recommended-defaults + empty-state changes already prevent the "0 copied" confusion.

## Version 5: Copyability Ranking

Status: Next target

Detailed spec: `docs/versions/V5_COPYABILITY_RANKING.md`

V5 ranks wallets by copyability, not generic fame or volume. Ranking combines simulated copy ROI, consistency, drawdown, recent performance, liquidity compatibility, activity, and data confidence.

V5 also integrates Polymarket's `/positions` endpoint as the authoritative snapshot of "now" — closing the gap where redemptions, merges, and other non-CLOB closures left our reconstruction stale — and surfaces `eventId`, `negativeRisk`, `redeemable`, and `mergeable` for downstream consumers. See `docs/versions/V5_COPYABILITY_RANKING.md` → "Positions Snapshot As Source Of Truth".

CLOB usage: `/book` depth and `/spread` can turn the V3 placeholder liquidity score into a real liquidity-compatibility input; `/prices-history` can sharpen drawdown/volatility from real prices rather than reconstructed values. See `docs/ARCHITECTURE.md` ("CLOB API Usage And Roadmap").

## Version 6: Copy Candidate Screener

Status: Planned

Detailed spec: `docs/versions/V6_COPY_CANDIDATE_SCREENER.md`

V6 helps discover copy candidates by filtering persisted metrics, ranking, simulator outputs, recent activity, category focus, and risk profile.

## Version 7: Copy Action Feed And Alerts

Status: Planned

Detailed spec: `docs/versions/V7_COPY_ACTION_FEED_ALERTS.md`

V7 shows actions worth reviewing now and delivers notifications when watched or high-ranking wallets open, add, reduce, or close positions. Alerts include copy context and risk indicators; they do not execute trades.

CLOB usage: live `/midpoint`, `/price`, and `/spread` (with their batch variants `/midpoints`, `/prices`, `/books`) provide current price and spread context for alerts across many watched markets. These only return data for currently-open markets. See `docs/ARCHITECTURE.md` ("CLOB API Usage And Roadmap").

## Version 8: Portfolio And Multi-Wallet Analytics

Status: Planned

Detailed spec: `docs/versions/V8_PORTFOLIO_MULTI_WALLET_ANALYTICS.md`

V8 compares multiple candidate wallets, detects overlap, estimates correlation, and helps avoid over-copying the same market exposure across several traders.
