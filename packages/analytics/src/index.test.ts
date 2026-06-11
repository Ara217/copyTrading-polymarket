import { describe, expect, it } from "vitest";
import {
  buildTradeHistoryAnalytics,
  buildPnlChart,
  calculateAdvancedPerformance,
  calculateCopyReadiness,
  calculateMaxDrawdown,
  calculateWalletMetrics,
  classifyOversizedTrades,
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

describe("trade history analytics", () => {
  it("labels entries, reductions, closes, realized PnL, and trade results", () => {
    const tradeHistory = buildTradeHistoryAnalytics([
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
        price: "0.50",
        size: "50",
        timestamp: "2025-01-02T00:00:00.000Z",
        side: "buy"
      },
      {
        id: "3",
        marketId: "market-1",
        conditionId: "condition-1",
        outcome: "Yes",
        price: "0.70",
        size: "80",
        timestamp: "2025-01-03T00:00:00.000Z",
        side: "sell"
      },
      {
        id: "4",
        marketId: "market-1",
        conditionId: "condition-1",
        outcome: "Yes",
        price: "0.30",
        size: "70",
        timestamp: "2025-01-04T00:00:00.000Z",
        side: "sell"
      }
    ]);

    expect(tradeHistory.map((trade) => trade.positionEffect)).toEqual(["entry", "add", "reduce", "close"]);
    expect(tradeHistory.map((trade) => trade.result)).toEqual(["open", "open", "win", "loss"]);
    expect(tradeHistory[2]?.realizedPnl).toBe("21.33333333");
    expect(tradeHistory[3]?.realizedPnl).toBe("-9.33333333");
    expect(tradeHistory[3]?.remainingShares).toBe("0");
  });
});

describe("advanced performance analytics", () => {
  const advancedTrades: AnalyticsTrade[] = [
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
      size: "100",
      timestamp: "2025-01-02T00:00:00.000Z",
      side: "sell"
    },
    {
      id: "3",
      marketId: "market-2",
      conditionId: "condition-2",
      outcome: "No",
      price: "0.80",
      size: "50",
      timestamp: "2025-01-03T00:00:00.000Z",
      side: "buy"
    },
    {
      id: "4",
      marketId: "market-2",
      conditionId: "condition-2",
      outcome: "No",
      price: "0.50",
      size: "50",
      timestamp: "2025-01-04T00:00:00.000Z",
      side: "sell"
    },
    {
      id: "5",
      marketId: "market-3",
      conditionId: "condition-3",
      outcome: "Yes",
      price: "0.20",
      size: "100",
      timestamp: "2025-01-05T00:00:00.000Z",
      side: "buy"
    }
  ];

  it("calculates realized/unrealized PnL, ROI, winrates, drawdowns, and streaks", () => {
    const positions = reconstructPositions(advancedTrades, [
      { marketId: "market-1", outcome: "Yes", price: "0", resolved: true, winningOutcome: "Yes" },
      { marketId: "market-2", outcome: "No", price: "0", resolved: true, winningOutcome: "Yes" },
      { marketId: "market-3", outcome: "Yes", price: "0.30" }
    ]);
    const performance = calculateAdvancedPerformance(advancedTrades, positions, [
      { marketId: "market-1", resolved: true },
      { marketId: "market-2", resolved: true },
      { marketId: "market-3", resolved: false }
    ]);

    expect(performance.realizedPnl).toBe("15");
    expect(performance.unrealizedPnl).toBe("10");
    expect(performance.totalPnl).toBe("25");
    expect(performance.roi).toBe("0.25");
    expect(performance.tradeWinrate).toBe("0.5");
    expect(performance.marketWinrate).toBe("0.66666667");
    expect(performance.resolvedMarketWinrate).toBe("0.5");
    expect(performance.maxDrawdown).toBe("15");
    expect(performance.currentDrawdown).toBe("5");
    expect(performance.averageDrawdown).toBe("10");
    expect(performance.longestWinStreak).toBe(1);
    expect(performance.longestLossStreak).toBe(1);
  });

  it("builds highlights, buckets, and win/loss chart data", () => {
    const positions = reconstructPositions(advancedTrades, [
      { marketId: "market-1", outcome: "Yes", price: "0", resolved: true, winningOutcome: "Yes" },
      { marketId: "market-2", outcome: "No", price: "0", resolved: true, winningOutcome: "Yes" },
      { marketId: "market-3", outcome: "Yes", price: "0.30" }
    ]);
    const performance = calculateAdvancedPerformance(advancedTrades, positions, [
      { marketId: "market-1", resolved: true },
      { marketId: "market-2", resolved: true },
      { marketId: "market-3", resolved: false }
    ]);

    expect(performance.bestTrade?.tradeId).toBe("2");
    expect(performance.bestTrade?.pnl).toBe("30");
    expect(performance.worstTrade?.tradeId).toBe("4");
    expect(performance.worstTrade?.pnl).toBe("-15");
    expect(performance.profitDistribution).toEqual([
      { bucket: "< -$100", count: 0 },
      { bucket: "-$100 to -$10", count: 1 },
      { bucket: "-$10 to $0", count: 0 },
      { bucket: "$0 to $10", count: 0 },
      { bucket: "$10 to $100", count: 2 },
      { bucket: "> $100", count: 0 }
    ]);
    expect(performance.winLossChart).toEqual([
      { date: "2025-01-02", wins: 1, losses: 0 },
      { date: "2025-01-04", wins: 0, losses: 1 }
    ]);
  });
});

describe("copy readiness analytics", () => {
  const readinessTrades: AnalyticsTrade[] = [
    {
      id: "1",
      marketId: "condition-politics",
      conditionId: "condition-politics",
      outcome: "Yes",
      price: "0.50",
      size: "100",
      timestamp: "2026-01-01T00:00:00.000Z",
      side: "buy"
    },
    {
      id: "2",
      marketId: "condition-politics",
      conditionId: "condition-politics",
      outcome: "Yes",
      price: "0.70",
      size: "100",
      timestamp: "2026-01-02T00:00:00.000Z",
      side: "sell"
    },
    {
      id: "3",
      marketId: "condition-sports",
      conditionId: "condition-sports",
      outcome: "No",
      price: "0.90",
      size: "300",
      timestamp: "2026-01-08T00:00:00.000Z",
      side: "buy"
    },
    {
      id: "4",
      marketId: "condition-sports",
      conditionId: "condition-sports",
      outcome: "No",
      price: "0.40",
      size: "300",
      timestamp: "2026-01-09T00:00:00.000Z",
      side: "sell"
    }
  ];

  it("groups category exposure and adds readiness warnings from copy constraints", () => {
    const positions = reconstructPositions(readinessTrades);
    const readiness = calculateCopyReadiness({
      trades: readinessTrades,
      positions,
      markets: [
        { marketId: "condition-politics", category: "Politics" },
        { marketId: "condition-sports", category: "Sports" }
      ],
      now: "2026-01-10T00:00:00.000Z",
      config: {
        copyBalance: "500",
        maxPositionSize: "100",
        minPositionSize: "10",
        oversizedThreshold: "100",
        topPercent: 0.5,
        relativeMultiplier: "1.5"
      }
    });

    expect(readiness.freshnessScore).toBe(100);
    expect(readiness.categoryExposure).toEqual([
      {
        category: "Sports",
        tradeCount: 2,
        marketCount: 1,
        positionCount: 1,
        volume: "390",
        volumeShare: "0.76470588"
      },
      {
        category: "Politics",
        tradeCount: 2,
        marketCount: 1,
        positionCount: 1,
        volume: "120",
        volumeShare: "0.23529412"
      }
    ]);
    expect(readiness.warnings.map((warning) => warning.code)).toContain("OVERSIZED_TRADES");
    expect(readiness.warnings.map((warning) => warning.code)).toContain("NEGATIVE_OVERSIZED_ROI");
  });

  it("classifies oversized trades by absolute, relative, and percentile methods", () => {
    const oversized = classifyOversizedTrades(readinessTrades, {
      copyBalance: "500",
      maxPositionSize: "100",
      minPositionSize: "10",
      oversizedThreshold: "100",
      topPercent: 0.25,
      relativeMultiplier: "1.5"
    });

    expect(oversized).toHaveLength(2);
    expect(oversized[0]?.tradeId).toBe("3");
    expect(oversized[0]?.value).toBe("270");
    expect(oversized[0]?.methods).toEqual(["threshold", "topPercent", "relative"]);
    expect(oversized[0]?.result).toBe("open");
    expect(oversized[1]?.result).toBe("loss");
  });
});
