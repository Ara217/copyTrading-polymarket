import { describe, expect, it } from "vitest";
import {
  interpolatePrice,
  simulateCopyTrading,
  simulateDelaySensitivity,
  type AnalyticsTrade,
  type CopySimulationInput
} from "./index";

function trade(partial: Partial<AnalyticsTrade> & Pick<AnalyticsTrade, "id" | "price" | "size" | "timestamp">): AnalyticsTrade {
  return {
    marketId: "market-1",
    conditionId: "condition-1",
    outcome: "Yes",
    side: "buy",
    ...partial
  };
}

const baseTrades: AnalyticsTrade[] = [
  trade({ id: "1", price: "0.40", size: "100", timestamp: "2025-01-01T00:00:00.000Z" }),
  trade({ id: "2", price: "0.70", size: "40", timestamp: "2025-01-02T00:00:00.000Z", side: "sell" }),
  trade({ id: "3", price: "0.80", size: "60", timestamp: "2025-01-03T00:00:00.000Z", side: "sell" })
];

function run(input: Partial<CopySimulationInput> = {}) {
  return simulateCopyTrading({
    trades: baseTrades,
    settings: { startingBalance: "1000", copyPercentage: "0.5", minPositionSize: "1" },
    ...input
  });
}

describe("copy sizing and balance accounting", () => {
  it("copies buys at the configured percentage and reduces proportionally on sells", () => {
    const result = run();

    expect(result.ledger).toHaveLength(3);
    expect(result.ledger[0]?.action).toBe("entry");
    expect(result.ledger[0]?.value).toBe("20");
    expect(result.ledger[0]?.shares).toBe("50");
    // trader reduced 40% of position, copier mirrors the proportion
    expect(result.ledger[1]?.action).toBe("reduce");
    expect(result.ledger[1]?.shares).toBe("20");
    expect(result.ledger[1]?.realizedPnl).toBe("6");
    expect(result.ledger[2]?.action).toBe("close");
    expect(result.ledger[2]?.shares).toBe("30");
    expect(result.ledger[2]?.realizedPnl).toBe("12");

    expect(result.summary.endingCash).toBe("1018");
    expect(result.summary.realizedPnl).toBe("18");
    expect(result.summary.totalPnl).toBe("18");
    expect(result.summary.roi).toBe("0.018");
    expect(result.summary.copiedTradeCount).toBe(3);
    expect(result.summary.missedTradeCount).toBe(0);
    expect(result.summary.winrate).toBe("1");
  });

  it("uses fixed copy amount when provided", () => {
    const result = run({
      settings: { startingBalance: "1000", fixedCopyAmount: "10", minPositionSize: "1" }
    });

    expect(result.ledger[0]?.value).toBe("10");
    expect(result.ledger[0]?.shares).toBe("25");
  });

  it("marks remaining open positions to market for unrealized PnL", () => {
    const result = simulateCopyTrading({
      trades: [baseTrades[0]!],
      marketPrices: [{ marketId: "condition-1", outcome: "Yes", price: "0.60" }],
      settings: { startingBalance: "1000", copyPercentage: "0.5", minPositionSize: "1" }
    });

    expect(result.summary.endingCash).toBe("980");
    expect(result.summary.openPositionValue).toBe("30");
    expect(result.summary.unrealizedPnl).toBe("10");
    expect(result.summary.endingEquity).toBe("1010");
  });
});

describe("position sizing limits", () => {
  it("skips buys below the minimum position size", () => {
    const result = run({
      settings: { startingBalance: "1000", fixedCopyAmount: "2", minPositionSize: "5" }
    });

    expect(result.ledger).toHaveLength(0);
    expect(result.missedTrades[0]?.reason).toBe("BELOW_MIN_SIZE");
  });

  it("caps buys at the maximum position size", () => {
    const result = run({
      settings: { startingBalance: "1000", fixedCopyAmount: "100", maxPositionSize: "30", minPositionSize: "1" }
    });

    expect(result.ledger[0]?.value).toBe("30");
  });

  it("caps buys by max total open exposure and reports fully blocked buys", () => {
    const trades = [
      trade({ id: "1", price: "0.50", size: "100", timestamp: "2025-01-01T00:00:00.000Z" }),
      trade({
        id: "2",
        marketId: "market-2",
        conditionId: "condition-2",
        price: "0.50",
        size: "100",
        timestamp: "2025-01-02T00:00:00.000Z"
      }),
      trade({
        id: "3",
        marketId: "market-3",
        conditionId: "condition-3",
        price: "0.50",
        size: "100",
        timestamp: "2025-01-03T00:00:00.000Z"
      })
    ];
    const result = simulateCopyTrading({
      trades,
      settings: {
        startingBalance: "1000",
        fixedCopyAmount: "50",
        maxTotalExposure: "60",
        minPositionSize: "5"
      }
    });

    expect(result.ledger).toHaveLength(2);
    expect(result.ledger[0]?.value).toBe("50");
    expect(result.ledger[1]?.value).toBe("10");
    expect(result.missedTrades[0]?.reason).toBe("MAX_TOTAL_EXPOSURE");
  });

  it("caps buys by max market exposure across outcomes", () => {
    const trades = [
      trade({ id: "1", price: "0.50", size: "100", timestamp: "2025-01-01T00:00:00.000Z" }),
      trade({ id: "2", outcome: "No", price: "0.50", size: "100", timestamp: "2025-01-02T00:00:00.000Z" })
    ];
    const result = simulateCopyTrading({
      trades,
      settings: {
        startingBalance: "1000",
        fixedCopyAmount: "50",
        maxMarketExposure: "70",
        minPositionSize: "5"
      }
    });

    expect(result.ledger[0]?.value).toBe("50");
    expect(result.ledger[1]?.value).toBe("20");
  });

  it("misses buys when cash runs out", () => {
    const result = run({
      settings: { startingBalance: "4", fixedCopyAmount: "50", minPositionSize: "5" }
    });

    expect(result.ledger).toHaveLength(0);
    expect(result.missedTrades[0]?.reason).toBe("INSUFFICIENT_BALANCE");
  });
});

describe("action and market filters", () => {
  it("filters trader actions outside the allowed set", () => {
    const result = run({
      settings: {
        startingBalance: "1000",
        copyPercentage: "0.5",
        minPositionSize: "1",
        allowedActions: ["entry"]
      }
    });

    expect(result.ledger).toHaveLength(1);
    expect(result.missedTrades).toHaveLength(2);
    expect(result.missedTrades[0]?.reason).toBe("ACTION_FILTERED");
  });

  it("excludes categories", () => {
    const result = run({
      markets: [{ marketId: "condition-1", category: "Sports" }],
      settings: {
        startingBalance: "1000",
        copyPercentage: "0.5",
        minPositionSize: "1",
        excludeCategories: ["Sports"]
      }
    });

    expect(result.ledger).toHaveLength(0);
    expect(result.missedTrades[0]?.reason).toBe("CATEGORY_EXCLUDED");
  });

  it("only includes whitelisted categories when includeCategories is set", () => {
    const result = run({
      markets: [{ marketId: "condition-1", category: "Politics" }],
      settings: {
        startingBalance: "1000",
        copyPercentage: "0.5",
        minPositionSize: "1",
        includeCategories: ["Crypto"]
      }
    });

    expect(result.ledger).toHaveLength(0);
    expect(result.missedTrades[0]?.reason).toBe("CATEGORY_EXCLUDED");
  });

  it("excludes unresolved markets when configured", () => {
    const result = run({
      markets: [{ marketId: "condition-1", resolved: false }],
      settings: {
        startingBalance: "1000",
        copyPercentage: "0.5",
        minPositionSize: "1",
        includeUnresolvedMarkets: false
      }
    });

    expect(result.ledger).toHaveLength(0);
    expect(result.missedTrades[0]?.reason).toBe("UNRESOLVED_MARKET_EXCLUDED");
  });

  it("excludes oversized trades when configured", () => {
    const trades = [
      trade({ id: "1", price: "0.50", size: "1000", timestamp: "2025-01-01T00:00:00.000Z" }),
      trade({
        id: "2",
        marketId: "market-2",
        conditionId: "condition-2",
        price: "0.50",
        size: "10",
        timestamp: "2025-01-02T00:00:00.000Z"
      })
    ];
    const result = simulateCopyTrading({
      trades,
      settings: {
        startingBalance: "1000",
        copyPercentage: "0.1",
        minPositionSize: "0",
        excludeOversizedTrades: true,
        oversizedConfig: { oversizedThreshold: "400", topPercent: 0.05, relativeMultiplier: "1000" }
      }
    });

    expect(result.missedTrades).toHaveLength(1);
    expect(result.missedTrades[0]?.sourceTradeId).toBe("1");
    expect(result.missedTrades[0]?.reason).toBe("OVERSIZED_TRADE");
    expect(result.ledger).toHaveLength(1);
    expect(result.ledger[0]?.sourceTradeId).toBe("2");
  });

  it("skips copies larger than observed trade liquidity when the liquidity filter is on", () => {
    const result = simulateCopyTrading({
      trades: [trade({ id: "1", price: "0.50", size: "10", timestamp: "2025-01-01T00:00:00.000Z" })],
      settings: {
        startingBalance: "1000",
        fixedCopyAmount: "50",
        minPositionSize: "1",
        liquidityFilterEnabled: true
      }
    });

    expect(result.ledger).toHaveLength(0);
    expect(result.missedTrades[0]?.reason).toBe("LIQUIDITY_FILTERED");
  });

  it("reports sells the copier cannot mirror", () => {
    const result = run({
      markets: [{ marketId: "condition-1", category: "Sports" }],
      settings: {
        startingBalance: "1000",
        copyPercentage: "0.5",
        minPositionSize: "1",
        excludeCategories: []
      }
    });
    expect(result.ledger).toHaveLength(3);

    const filteredEntry = simulateCopyTrading({
      trades: baseTrades,
      settings: {
        startingBalance: "1000",
        copyPercentage: "0.5",
        minPositionSize: "100000"
      }
    });

    expect(filteredEntry.ledger).toHaveLength(0);
    expect(filteredEntry.missedTrades.map((missed) => missed.reason)).toEqual([
      "BELOW_MIN_SIZE",
      "NOTHING_TO_REDUCE",
      "NOTHING_TO_REDUCE"
    ]);
  });
});

describe("price interpolation", () => {
  it("linearly interpolates between two timeseries points", () => {
    const points = [
      { t: Date.parse("2025-01-01T00:00:00.000Z"), p: "0.40" },
      { t: Date.parse("2025-01-01T00:10:00.000Z"), p: "0.50" }
    ];
    // halfway (5 min) -> midpoint of 0.40 and 0.50
    expect(interpolatePrice(points, Date.parse("2025-01-01T00:05:00.000Z"))?.toString()).toBe("0.45");
  });

  it("clamps to the nearest endpoint outside the series and returns null when empty", () => {
    const points = [
      { t: Date.parse("2025-01-01T00:00:00.000Z"), p: "0.40" },
      { t: Date.parse("2025-01-01T00:10:00.000Z"), p: "0.50" }
    ];
    expect(interpolatePrice(points, Date.parse("2024-12-31T00:00:00.000Z"))?.toString()).toBe("0.4");
    expect(interpolatePrice(points, Date.parse("2030-01-01T00:00:00.000Z"))?.toString()).toBe("0.5");
    expect(interpolatePrice([], 123)).toBeNull();
  });
});

describe("delay replay", () => {
  it("fills at the real market midpoint from price history when available (method=history)", () => {
    const trades = [trade({ id: "1", price: "0.40", size: "100", timestamp: "2025-01-01T00:00:00.000Z" })];
    const result = simulateCopyTrading({
      trades,
      priceHistory: [
        {
          marketId: "market-1",
          outcome: "Yes",
          points: [
            { t: Date.parse("2025-01-01T00:00:00.000Z"), p: "0.40" },
            { t: Date.parse("2025-01-01T00:10:00.000Z"), p: "0.60" }
          ]
        }
      ],
      settings: { startingBalance: "1000", fixedCopyAmount: "10", minPositionSize: "1", delaySeconds: 300 }
    });

    // 5 minutes into a 0.40 -> 0.60 move = 0.50
    expect(result.ledger[0]?.executionPrice).toBe("0.5");
    expect(result.ledger[0]?.executedAt).toBe("2025-01-01T00:05:00.000Z");
    expect(result.ledger[0]?.fillMethod).toBe("history");
    expect(result.summary.fillMethodCounts.history).toBe(1);
  });

  it("uses the source price exactly at delay 0 (method=actual)", () => {
    const result = simulateCopyTrading({
      trades: [baseTrades[0]!],
      settings: { startingBalance: "1000", fixedCopyAmount: "10", minPositionSize: "1", delaySeconds: 0 }
    });

    expect(result.ledger[0]?.executionPrice).toBe("0.4");
    expect(result.ledger[0]?.fillMethod).toBe("actual");
  });

  it("falls back to an adverse slippage estimate when no price history exists (method=slippage)", () => {
    const buy = simulateCopyTrading({
      trades: [trade({ id: "1", price: "0.50", size: "100", timestamp: "2025-01-01T00:00:00.000Z" })],
      settings: { startingBalance: "1000", fixedCopyAmount: "10", minPositionSize: "1", delaySeconds: 600 }
    });
    // buy pays MORE after delay
    expect(buy.ledger[0]?.fillMethod).toBe("slippage");
    expect(Number(buy.ledger[0]?.executionPrice)).toBeGreaterThan(0.5);

    // longer delay = worse fill for a buy (monotonic)
    const longer = simulateCopyTrading({
      trades: [trade({ id: "1", price: "0.50", size: "100", timestamp: "2025-01-01T00:00:00.000Z" })],
      settings: { startingBalance: "1000", fixedCopyAmount: "10", minPositionSize: "1", delaySeconds: 1800 }
    });
    expect(Number(longer.ledger[0]?.executionPrice)).toBeGreaterThan(Number(buy.ledger[0]?.executionPrice));
  });

  it("summarizes ROI sensitivity across delays", () => {
    const sensitivity = simulateDelaySensitivity(
      {
        trades: baseTrades,
        settings: { startingBalance: "1000", copyPercentage: "0.5", minPositionSize: "1" }
      },
      [0, 300]
    );

    expect(sensitivity).toHaveLength(2);
    expect(sensitivity[0]?.delaySeconds).toBe(0);
    expect(sensitivity[0]?.roi).toBe("0.018");
    expect(sensitivity[1]?.delaySeconds).toBe(300);
  });
});

describe("equity curve and drawdown", () => {
  it("builds a daily equity curve from realized results", () => {
    const result = run();

    expect(result.equityCurve.map((point) => point.date)).toEqual(["2025-01-01", "2025-01-02", "2025-01-03"]);
    expect(result.equityCurve[0]?.equity).toBe("1000");
    expect(result.equityCurve[1]?.equity).toBe("1006");
    expect(result.equityCurve[2]?.equity).toBe("1018");
    expect(result.equityCurve[2]?.cash).toBe("1018");
    expect(result.equityCurve[2]?.openExposure).toBe("0");
  });

  it("computes max drawdown from the equity curve", () => {
    const trades = [
      trade({ id: "1", price: "0.50", size: "100", timestamp: "2025-01-01T00:00:00.000Z" }),
      trade({ id: "2", price: "0.10", size: "100", timestamp: "2025-01-02T00:00:00.000Z", side: "sell" })
    ];
    const result = simulateCopyTrading({
      trades,
      settings: { startingBalance: "1000", copyPercentage: "0.5", minPositionSize: "1" }
    });

    expect(result.summary.realizedPnl).toBe("-20");
    expect(result.summary.maxDrawdown).toBe("20");
    expect(result.summary.maxDrawdownPercent).toBe("0.02");
  });

  it("stops opening new positions after the drawdown threshold is hit", () => {
    const trades = [
      trade({ id: "1", price: "0.50", size: "100", timestamp: "2025-01-01T00:00:00.000Z" }),
      trade({ id: "2", price: "0.10", size: "100", timestamp: "2025-01-02T00:00:00.000Z", side: "sell" }),
      trade({
        id: "3",
        marketId: "market-2",
        conditionId: "condition-2",
        price: "0.50",
        size: "100",
        timestamp: "2025-01-03T00:00:00.000Z"
      })
    ];
    const result = simulateCopyTrading({
      trades,
      settings: {
        startingBalance: "1000",
        copyPercentage: "0.5",
        minPositionSize: "1",
        drawdownStopPercent: "0.01"
      }
    });

    expect(result.summary.drawdownStopTriggered).toBe(true);
    expect(result.missedTrades.at(-1)?.reason).toBe("DRAWDOWN_STOP");
    expect(result.ledger.map((entry) => entry.sourceTradeId)).toEqual(["1", "2"]);
  });
});

describe("result reporting", () => {
  it("counts missed trades per reason and per category", () => {
    const result = run({
      markets: [{ marketId: "condition-1", category: "Sports" }],
      settings: {
        startingBalance: "1000",
        copyPercentage: "0.5",
        minPositionSize: "1",
        excludeCategories: ["Sports"]
      }
    });

    expect(result.summary.missedTradeCount).toBe(3);
    expect(result.summary.missedReasonCounts.CATEGORY_EXCLUDED).toBe(1);
    expect(result.summary.missedReasonCounts.NOTHING_TO_REDUCE).toBe(2);
    expect(result.categoryBreakdown[0]?.category).toBe("Sports");
    expect(result.categoryBreakdown[0]?.missedTradeCount).toBe(3);
  });

  it("aggregates copied volume and realized PnL per category", () => {
    const result = run({ markets: [{ marketId: "condition-1", category: "Crypto" }] });

    expect(result.categoryBreakdown).toHaveLength(1);
    expect(result.categoryBreakdown[0]?.category).toBe("Crypto");
    expect(result.categoryBreakdown[0]?.copiedTradeCount).toBe(3);
    expect(result.categoryBreakdown[0]?.realizedPnl).toBe("18");
  });
});
