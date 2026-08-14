# PRODUCT BRIEF — DRAFT / ADVISORY ONLY

> **STATUS: DRAFT. DO NOT IMPLEMENT.**
> This document does not change `docs/ROADMAP.md`, `docs/versions/*`, `docs/DECISIONS.md`, or any committed plan.
> It is a competitive/product analysis written on 2026-06-25. Nothing here is approved work.
> The version order in `CLAUDE.md` (next target V6) remains authoritative until the owner says otherwise.

---

## 1. One-line thesis

The wallet-analytics layer (V1/V2/V7-style tracking + alerts) is **commoditized and largely free** across 15+ competitors. The defensible product is the **copy-trading due-diligence layer** competitors structurally won't build: *"Would copying this wallet actually have made **me** money, given my latency, capital, and fills — and am I double-exposed across the wallets I copy?"*

That maps to **V4 (simulator) → V6 (sim-driven screener) → V8 (multi-wallet overlap risk)**, plus one gap they all have that we also have: **market-odds movement**.

## 2. Competitive landscape (researched 2026-06-25)

**Analytics / trackers — crowded, mostly free:**
- [Polynyx](https://polynyx.com/) — 200k leaderboard, whale tape, wallet deep-dives free; $9.99/mo multi-wallet
- [PolyWallet](https://polymark.et/product/polywallet) — deep analysis, 20-wallet track, Telegram alerts
- [PolyTrack](https://www.polytrackhq.app/) — live positions/PnL, 3 free
- [Alphascope](https://www.alphascope.app/tools/polymarket-wallet-tracker) — free lookup + whale alerts
- [WalletMaster / Polymarket Radar](https://www.walletmaster.tools/polymarket-wallet-tracker/) — **filterable copyable-wallet table, fee-adjusted PnL 7/30/90/all** (closest to our V5/V6)
- [PolymarketDash](https://polymark.et/product/polymarketdash), [Polycool](https://polymark.et/product/polycool) (top 0.5%), [PredictingTop](https://polymark.et/product/predicting-top), [polymarketanalytics.com](https://polymarketanalytics.com/traders), Polymarket's [native leaderboard](https://polymarket.com/leaderboard)

**Execution bots — where revenue concentrates (we deliberately DON'T go here):**
- [Stand.Trade / COPYCAT](https://news.polymarket.com/p/copycat) — **official Polymarket partner**, copy + counter-trade, 1.5k wallets / 5k strategies in 2 months
- [Poly Syncer](https://www.polysyncer.com/), [TradePolyBot](https://polymart.app/tradepolybot), [PolyGun](https://polymarketanalytics.com/copy-trade), [PolyFocus](https://polymark.et/product/polyfocus)

**Market-odds movement (gap in our spec — table stakes for them):**
- [Lychee](https://lycheedata.com/guides/polymarket-odds-over-time) — odds over time, probability momentum
- [TrendSpider](https://trendspider.com/blog/polymarket-custom-indicators/) — live odds charts/indicators
- [Polymarket Alerts app](https://apps.apple.com/us/app/polymarket-alerts/id6748630806) — explicit % movement + price alerts

## 3. Version-by-version vs. competitors

| Version | Competitor coverage | Verdict |
|---|---|---|
| V1 wallet analyzer | All, free | Commodity — keep, don't market on it |
| V2 perf analytics | Radar, Polynyx (fee-adjusted) | Commodity |
| V3 copy-readiness | Polycool, Radar (partial) | Partial edge — oversized-trade / liquidity-compat angle is sharper |
| **V4 simulator** | **Almost nobody** | ✅ **Moat** — honest historical fill-realistic backtest |
| V5 ranking | Leaderboards rank by raw PnL | Edge **only if** fed by V4 sim, not raw PnL |
| **V6 screener** | Radar has filter-table; lacks sim-ROI / neg-risk / redeemable filters | ✅ Sim-driven + neg-risk/redeemable filters are novel |
| V7 action feed/alerts | Polynyx, Polycool, Stand — real-time, some sub-3s | ❌ Late + structurally slower (refresh-tick diff vs. on-chain streaming) |
| **V8 multi-wallet overlap** | Polynyx Premium has multi-wallet; overlap/correlation/collision is rare | ✅ Differentiated |

## 4. Recommended repositioning (proposal — not a plan change)

**Brand:** "The copy-trading reality check for Polymarket." Be the tool that tells people copy-trading is *harder* than the execution bots admit — leaning into our own documented caveats (sharp traders run secondary accounts; ~1000-trade API window). The bots are incentivized to say "yes, copy"; we're the honest second opinion.

**Hero feature:** V4 simulator, not buried as "done." The defensible question is the copier's *personalized* outcome (capital, delay, fills, fees), not the trader's headline PnL.

**Funnel:** V4 sim → V6 sim-driven screener → V8 overlap/correlation risk. V1/V2/V7 are supporting cast, not the pitch.

## 5. Identified gap: market-odds movement layer

Entire V1–V8 is wallet-centric — we track what wallets do, never what *markets* do. No odds chart, no probability momentum, no "market moved +18% in 24h." Adding a lightweight market-odds-%-change + momentum signal would:
1. Close the obvious gap vs. Lychee/TrendSpider/Alerts app.
2. Make V7 actionable: "wallet entered AND market still at copyable odds" beats "wallet entered" alone.

**Open question for owner:** does this jump the queue ahead of V7, or slot in as a cross-cutting data source feeding V6 filters + V7 alerts? (Recommend the latter — it's an input, not a standalone version.) Stays a backend concern per the analytics-authority boundary; clients only display.

## 6. Monetization reality

We refuse execution (correct, keeps us legally clean) — but that cedes the layer where bots monetize. Realistic paths:
- Affiliate/referral into execution bots (we're their top-of-funnel due-diligence).
- Paid screener (V6) + multi-wallet portfolio (V8) for serious copiers — the work casual trackers won't replicate.

## 7. Anti-goals (unchanged, reaffirmed)

No live order placement, wallet signing, private-key handling, or auto-trading. We are intelligence, not execution.

---

*Skipped: implementation, schema, endpoint design, and any change to version order — by request. Add when the owner approves a direction.*
