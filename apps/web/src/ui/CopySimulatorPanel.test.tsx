import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CopySimulationRecord } from "@polyand/types";
import { CopySimulationResults } from "./CopySimulatorPanel";

const record: CopySimulationRecord = {
  id: "sim-1",
  walletAddress: "0x1111111111111111111111111111111111111111",
  createdAt: "2026-06-12T00:00:00.000Z",
  settings: {
    startingBalance: "1000",
    copyPercentage: "0.5",
    fixedCopyAmount: null,
    maxPositionSize: null,
    minPositionSize: "1",
    maxMarketExposure: null,
    maxTotalExposure: null,
    delaySeconds: 0,
    allowedActions: ["entry", "add", "reduce", "close"],
    includeCategories: [],
    excludeCategories: [],
    includeUnresolvedMarkets: true,
    liquidityFilterEnabled: false,
    excludeOversizedTrades: false,
    oversizedConfig: null,
    drawdownStopPercent: null
  },
  result: {
    settings: {
      startingBalance: "1000",
      copyPercentage: "0.5",
      fixedCopyAmount: null,
      maxPositionSize: null,
      minPositionSize: "1",
      maxMarketExposure: null,
      maxTotalExposure: null,
      delaySeconds: 0,
      allowedActions: ["entry", "add", "reduce", "close"],
      includeCategories: [],
      excludeCategories: [],
      includeUnresolvedMarkets: true,
      liquidityFilterEnabled: false,
      excludeOversizedTrades: false,
      oversizedConfig: null,
      drawdownStopPercent: null
    },
    summary: {
      startingBalance: "1000",
      endingCash: "1018",
      openPositionValue: "0",
      endingEquity: "1018",
      realizedPnl: "18",
      unrealizedPnl: "0",
      totalPnl: "18",
      roi: "0.018",
      winrate: "1",
      copiedTradeCount: 3,
      closedCopyTradeCount: 2,
      missedTradeCount: 1,
      missedReasonCounts: { BELOW_MIN_SIZE: 1 },
      fillMethodCounts: { actual: 1 },
      maxDrawdown: "0",
      maxDrawdownPercent: "0",
      drawdownStopTriggered: false
    },
    ledger: [
      {
        sourceTradeId: "trade-1",
        marketId: "condition-1",
        marketTitle: "Will the simulated market resolve yes?",
        conditionId: "condition-1",
        outcome: "Yes",
        action: "entry",
        side: "buy",
        traderTimestamp: "2025-01-01T00:00:00.000Z",
        executedAt: "2025-01-01T00:00:00.000Z",
        executionPrice: "0.4",
        fillMethod: "actual",
        shares: "50",
        value: "20",
        realizedPnl: "0",
        cashAfter: "980",
        openExposureAfter: "20"
      }
    ],
    missedTrades: [
      {
        sourceTradeId: "trade-9",
        marketId: "condition-2",
        marketTitle: "A skipped market",
        conditionId: "condition-2",
        outcome: "No",
        action: "entry",
        timestamp: "2025-01-02T00:00:00.000Z",
        reason: "BELOW_MIN_SIZE",
        detail: "The computed copy size is below the configured minimum position size."
      }
    ],
    equityCurve: [
      { date: "2025-01-01", cash: "980", openExposure: "20", equity: "1000" },
      { date: "2025-01-03", cash: "1018", openExposure: "0", equity: "1018" }
    ],
    categoryBreakdown: [
      { category: "Crypto", copiedTradeCount: 3, missedTradeCount: 1, volume: "58", realizedPnl: "18" }
    ],
    delaySensitivity: [
      { delaySeconds: 0, roi: "0.018", totalPnl: "18", copiedTradeCount: 3, missedTradeCount: 1 },
      { delaySeconds: 300, roi: "0.012", totalPnl: "12", copiedTradeCount: 3, missedTradeCount: 1 }
    ]
  }
};

describe("CopySimulationResults", () => {
  it("renders the simulation summary, ledger, missed trades, and delay sensitivity", () => {
    const markup = renderToStaticMarkup(<CopySimulationResults record={record} />);

    expect(markup).toContain("$1,018");
    expect(markup).toContain("1.8%");
    expect(markup).toContain("Will the simulated market resolve yes?");
    expect(markup).toContain("A skipped market");
    expect(markup).toContain("BELOW_MIN_SIZE");
    expect(markup).toContain("Crypto");
    expect(markup).toContain("5m");
    // Option A: fill-method labeling surfaces how delayed fills were priced
    expect(markup).toContain("How fills are priced");
    expect(markup).toContain("Delay scenarios");
    expect(markup).toContain("at trade price");
  });
});
