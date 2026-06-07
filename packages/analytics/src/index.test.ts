import { describe, expect, it } from "vitest";
import {
  buildPnlChart,
  calculateMaxDrawdown,
  calculateWalletMetrics,
  reconstructPositions,
  type AnalyticsTrade
} from "./index";

const trades: AnalyticsTrade[] = [
  {
    id: "1",
    marketId: "market-1",
    conditionId: "condition-1",
    outcome: "Yes",
    price: "0.40",
    size: "100",
    timestamp: "2025-01-01T00:00:00.000Z",
    side: "buy"
  },
  {
    id: "2",
    marketId: "market-1",
    conditionId: "condition-1",
    outcome: "Yes",
    price: "0.70",
    size: "40",
    timestamp: "2025-01-02T00:00:00.000Z",
    side: "sell"
  }
];

describe("position reconstruction", () => {
  it("reconstructs current shares and realized/unrealized PnL with Decimal math", () => {
    const positions = reconstructPositions(trades, [
      { marketId: "market-1", outcome: "Yes", price: "0.60" }
    ]);

    expect(positions).toHaveLength(1);
    expect(positions[0]?.currentShares).toBe("60");
    expect(positions[0]?.averageEntryPrice).toBe("0.4");
    expect(positions[0]?.realizedPnl).toBe("12");
    expect(positions[0]?.unrealizedPnl).toBe("12");
    expect(positions[0]?.totalPnl).toBe("24");
  });

  it("pays one dollar for winning resolved outcomes", () => {
    const positions = reconstructPositions([trades[0]], [
      {
        marketId: "market-1",
        outcome: "Yes",
        price: "0",
        resolved: true,
        winningOutcome: "Yes"
      }
    ]);

    expect(positions[0]?.unrealizedPnl).toBe("60");
  });
});

describe("wallet metrics", () => {
  it("calculates volume, winrate, and total PnL", () => {
    const positions = reconstructPositions(trades, [
      { marketId: "market-1", outcome: "Yes", price: "0.60" }
    ]);
    const metrics = calculateWalletMetrics(trades, positions);

    expect(metrics.volume).toBe("68");
    expect(metrics.winrate).toBe("1");
    expect(metrics.totalPnl).toBe("24");
    expect(metrics.tradeCount).toBe(2);
  });

  it("calculates drawdown from PnL chart points", () => {
    const positions = reconstructPositions(trades, [
      { marketId: "market-1", outcome: "Yes", price: "0.60" }
    ]);
    const points = buildPnlChart(trades, positions);
    expect(points.at(-1)?.cumulativePnl).toBe("24");
    expect(calculateMaxDrawdown(points)).toBe("0");
  });
});
