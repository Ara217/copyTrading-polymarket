# Codex Handoff

Codex should use this file as the operating guide for future sessions in this repository.

## Repository Purpose

This repository implements a Polymarket Analytics Platform for analyzing wallet performance and evaluating copy-trading opportunities.

Do not implement trading execution. Do not implement private-key handling. Do not implement automated live copy trading.

## Required Context

Before coding, read:

```text
AGENTS.md
docs/DECISIONS.md
docs/ARCHITECTURE.md
docs/API_CONTRACTS.md
docs/ROADMAP.md
docs/versions/<current-version>.md
```

Current baseline is V1. The next feature version is V2:

```text
docs/versions/V2_PERFORMANCE_ANALYTICS.md
```

## Skills To Use

For future implementation work, use the relevant local skills:

- `product-capability` for version planning and capability contracts.
- `api-design` for endpoint design and response contracts.
- `backend-patterns` for NestJS, Prisma, Redis, BullMQ, and service boundaries.
- `frontend-patterns` for React, Zustand, Tailwind, and extension UI.
- `tdd-workflow` for tests before feature implementation.
- `security-review` for endpoints, secrets, alerts, webhook delivery, and input validation.

## Implementation Order For New Versions

1. Read current version spec.
2. Update architecture/API docs if needed.
3. Add tests for analytics logic first.
4. Implement `packages/analytics`.
5. Add Prisma schema changes and migrations.
6. Implement API services/controllers/workers.
7. Implement extension UI.
8. Run verification.
9. Update docs and decisions.

## Verification

Always run:

```bash
npm test
npm run typecheck
npm run build
```

For database changes:

```bash
docker compose up -d
XDG_CACHE_HOME=.cache npm run prisma:migrate
```

For API runtime:

```bash
npm run dev:api
curl http://localhost:3000/api/v1/health
```

## Local Docker Notes

Docker Desktop must be running before Compose works.

Run Compose from the project root:

```bash
cd /Users/tatevikmeloyan/Projects/copytrading-polyand
docker compose up -d
```

If the shell cannot find Docker, Docker Desktop's CLI path is:

```bash
/Applications/Docker.app/Contents/Resources/bin
```

## Current Runtime Notes

The app has been verified with:

- Docker Compose services healthy.
- Prisma migration applied.
- API health endpoint returning `{"data":{"ok":true}}`.
- Tests/typecheck/build passing.
- Five Polymarket profile URLs checked with Playwright network traces.
- Profile slugs shaped `0x...-timestamp` resolve to the embedded `0x...` address, matching Polymarket Data API calls.
- High-activity wallets can store 1000 V1 Data API trades while the extension displays the first 100 and shows the loaded count.

## Boundaries

- Extension can call API and render results.
- Extension cannot compute heavy analytics.
- Backend owns all PnL, reconstruction, rankings, backtesting, and alerts.
- All money values should be represented as strings in API responses.
- Decimal.js is mandatory for money math.

## Documentation Updates

When adding a version feature:

- Update the relevant `docs/versions/V*_*.md` file status.
- Update `docs/API_CONTRACTS.md` for endpoint changes.
- Update `docs/DECISIONS.md` for architectural or scoring decisions.
- Update `docs/ROADMAP.md` when a version is completed.
