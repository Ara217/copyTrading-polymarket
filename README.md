# Polyand Polymarket Analytics

Local-first Polymarket wallet analytics platform for reconstructing wallet performance from historical trades.

This is not a trading bot and does not execute trades.

## Stack

- API: NestJS, Prisma, PostgreSQL, Redis, BullMQ, Zod, Decimal.js
- Extension: React, TypeScript, Vite, Tailwind CSS, Zustand, ECharts, Chrome Extension MV3
- Monorepo: npm workspaces

## Local Setup

```bash
cp .env.example .env
cp apps/extension/.env.example apps/extension/.env
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev:api
```

Build the extension:

```bash
npm run build -w apps/extension
```

Load `apps/extension/dist` as an unpacked Chrome extension.

## Version 1 Flow

1. Paste a wallet or open a Polymarket URL containing a wallet address.
2. Click `Refresh` to enqueue a BullMQ wallet sync job.
3. Wait for the worker to fetch trades and reconstruct positions.
4. Click `Load` to view overview metrics, positions, trades, and PnL chart.

## Important Notes

- All analytics run on the backend.
- All money math uses Decimal.js.
- V1 stores raw JSON on domain models with `source`, `fetchedAt`, and `adapterVersion`.
- Critical decisions are tracked in [docs/DECISIONS.md](docs/DECISIONS.md).
- Future implementation instructions are in [docs/versions](docs/versions).
- Agent handoff instructions are in [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), and [CODEX.md](CODEX.md).
