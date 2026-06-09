# Agent Instructions

This file is the shared handoff for all coding agents working in this repository.

## Project

Polymarket Copy-Trading Intelligence Platform for evaluating Polymarket wallets, finding copy candidates, simulating manual copy strategies, and monitoring trader actions.

This is not a trading bot. This system must not execute trades, sign transactions, custody funds, store private keys, or automate live trading.

## Required Read Order

Before implementing any feature, read these files:

1. `docs/DECISIONS.md`
2. `docs/ARCHITECTURE.md`
3. `docs/API_CONTRACTS.md`
4. `docs/ROADMAP.md`
5. The relevant version file in `docs/versions/`

Version files:

- `docs/versions/V1_WALLET_ANALYZER.md`
- `docs/versions/V2_PERFORMANCE_ANALYTICS.md`
- `docs/versions/V3_COPY_READINESS.md`
- `docs/versions/V4_COPY_TRADING_SIMULATOR.md`
- `docs/versions/V5_COPYABILITY_RANKING.md`
- `docs/versions/V6_COPY_CANDIDATE_SCREENER.md`
- `docs/versions/V7_COPY_ACTION_FEED_ALERTS.md`
- `docs/versions/V8_PORTFOLIO_MULTI_WALLET_ANALYTICS.md`

## Version Discipline

Do not jump between versions.

Only start the next version after the current version satisfies its done criteria and these commands pass:

```bash
npm test
npm run typecheck
npm run build
```

For database-backed work, also verify:

```bash
docker compose up -d
XDG_CACHE_HOME=.cache npm run prisma:migrate
curl http://localhost:3000/api/v1/health
```

## Architecture Rules

Chrome Extension must contain:

- UI
- Charts
- Tables
- Search
- Wallet detection

Chrome Extension must not contain:

- Heavy calculations
- PnL engine
- Position reconstruction
- Backtesting
- Wallet ranking

Backend must own:

- Polymarket API adapters
- Raw response validation
- Persistence
- Redis cache
- BullMQ jobs
- Position reconstruction
- PnL
- Analytics
- Ranking
- Simulation
- Alerts

## Tech Stack

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- ECharts
- Chrome Extension Manifest V3

Backend:

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ
- Zod
- Decimal.js

Repository:

```text
apps/
  api/
  extension/
  web/
packages/
  shared/
  types/
  analytics/
docs/
  versions/
```

## Data Sources

Use:

- Polymarket Gamma API
- Polymarket Data API
- Polymarket CLOB API

Store raw JSON on domain models with:

- `source`
- `fetchedAt`
- `adapterVersion`

Validate upstream responses with Zod.

## Money Rule

Never use JavaScript floating point for money calculations.

Use Decimal.js for:

- PnL
- Price
- Size
- Value
- ROI
- Drawdown
- Ranking scores involving money
- Simulation balances

API DTOs should serialize money values as strings.

## Database Rule

Use Prisma migrations for schema changes.

Schema lives at:

```text
apps/api/prisma/schema.prisma
```

Do not edit generated Prisma client files.

## Testing Rule

Add or update tests for every feature.

Required areas:

- Analytics unit tests in `packages/analytics`
- Shared validation tests in `packages/shared`
- API tests in `apps/api`
- Extension tests or E2E tests when UI behavior changes

Run:

```bash
npm test
npm run typecheck
npm run build
```

## Security Rules

- Never hardcode secrets.
- Use environment variables.
- Validate all API inputs with Zod or equivalent schema validation.
- Do not log private tokens or webhook secrets.
- Do not add live-trading functionality.
- Treat wallet analytics as public-chain analytics, not custody.

## Local Development

```bash
cp .env.example .env
cp .env.example apps/api/.env
cp apps/extension/.env.example apps/extension/.env
docker compose up -d
XDG_CACHE_HOME=.cache npm run prisma:migrate
npm run dev:api
```

Extension:

```bash
npm run build -w apps/extension
```

Load `apps/extension/dist` as an unpacked Chrome extension.

## Current Baseline

V1 is implemented. Before starting V2, validate real Polymarket wallet syncs and inspect adapter output quality.
