import { describe, expect, it } from "vitest";
import { computeWalletRanking, DEFAULT_WEIGHTS, WEIGHTS_VERSION, type RankingInputs } from "./ranking.js";

function baseInputs(overrides: Partial<RankingInputs> = {}): RankingInputs {
  return {
    metrics: {
      totalPnl: "500",
      realizedPnl: "400",
      unrealizedPnl: "100",
      roi: "0.25",
      tradeWinrate: "0.62",
      marketWinrate: "0.55",
      maxDrawdown: "-0.12",
      currentDrawdown: "-0.05",
      longestWinStreak: 5,
      longestLossStreak: 2,
      tradeCount: 80,
      volume: "10000",
      profitDistributionJson: [],
      winLossChartJson: Array.from({ length: 30 }, () => ({ wins: 3, losses: 2 }))
    },
    readiness: {
      readinessScore: 75,
      dataCoverageScore: 80,
      freshnessScore: 85,
      activityScore: 70,
      liquidityScore: 60,
      positionSizeScore: 70,
      oversizedTradeSummary: { count: 1, roi: "0", winrate: "0" },
      dataValidation: { apiWindowLimited: false }
    },
    simulator: {
      summary: {
        roi: "0.40",
        maxDrawdownPercent: "-0.10",
        winrate: "0.58",
        copiedTradeCount: 60,
        missedTradeCount: 5
      },
      delaySensitivity: [
        { delaySeconds: 0, roi: "0.40" },
        { delaySeconds: 60, roi: "0.36" },
        { delaySeconds: 300, roi: "0.32" }
      ]
    },
    positions: [
      { eventId: "ev-1", negativeRisk: false, snapshotSource: "snapshot", currentShares: "10" },
      { eventId: "ev-1", negativeRisk: false, snapshotSource: "snapshot", currentShares: "5" },
      { eventId: "ev-2", negativeRisk: false, snapshotSource: "snapshot", currentShares: "7" }
    ],
    snapshotChecked: true,
    profile: {
      copyBalance: "1000",
      maxPositionSize: "100",
      delaySeconds: 0,
      includedCategories: []
    },
    ...overrides
  };
}

describe("computeWalletRanking", () => {
  it("returns scores in [0,100] and matches the documented weights version", () => {
    const result = computeWalletRanking(baseInputs());
    expect(result.weightsVersion).toBe(WEIGHTS_VERSION);
    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.finalScore).toBeLessThanOrEqual(100);
    for (const c of Object.values(result.components)) {
      if (c.score !== null) {
        expect(c.score).toBeGreaterThanOrEqual(0);
        expect(c.score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("redistributes null component weight to dataConfidence only", () => {
    const noSim = computeWalletRanking(baseInputs({ simulator: null }));
    expect(noSim.components.simulatedRoi.score).toBeNull();
    expect(noSim.components.delayTolerance.score).toBeNull();
    expect(noSim.components.dataConfidence.weight).toBeGreaterThan(DEFAULT_WEIGHTS.dataConfidence);
    expect(noSim.components.dataConfidence.weight).toBe(
      DEFAULT_WEIGHTS.dataConfidence + DEFAULT_WEIGHTS.simulatedRoi + DEFAULT_WEIGHTS.delayTolerance
    );
    // Other component weights unchanged.
    expect(noSim.components.liquidity.weight).toBe(DEFAULT_WEIGHTS.liquidity);
  });

  it("classifies above 80 as strong and 90+ as prime", () => {
    const strong = computeWalletRanking(
      baseInputs({
        metrics: {
          totalPnl: "5000",
          realizedPnl: "5000",
          unrealizedPnl: "0",
          roi: "1.5",
          tradeWinrate: "0.85",
          marketWinrate: "0.8",
          maxDrawdown: "-0.05",
          currentDrawdown: "0",
          longestWinStreak: 15,
          longestLossStreak: 1,
          tradeCount: 250,
          volume: "100000",
          profitDistributionJson: [],
          winLossChartJson: Array.from({ length: 30 }, () => ({ wins: 9, losses: 1 }))
        },
        readiness: {
          readinessScore: 95,
          dataCoverageScore: 95,
          freshnessScore: 95,
          activityScore: 90,
          liquidityScore: 90,
          positionSizeScore: 85,
          oversizedTradeSummary: { count: 0, roi: "0", winrate: "0" },
          dataValidation: { apiWindowLimited: false }
        },
        simulator: {
          summary: {
            roi: "1.2",
            maxDrawdownPercent: "-0.04",
            winrate: "0.78",
            copiedTradeCount: 200,
            missedTradeCount: 5
          },
          delaySensitivity: [
            { delaySeconds: 0, roi: "1.2" },
            { delaySeconds: 300, roi: "1.18" }
          ]
        }
      })
    );
    expect(strong.finalScore).toBeGreaterThanOrEqual(80);
    expect(["Strong copy candidate", "Prime copy candidate"]).toContain(strong.classification);
  });

  it("forces Avoid classification when liquidity collapses even if other components are strong", () => {
    const result = computeWalletRanking(
      baseInputs({
        readiness: {
          readinessScore: 70,
          dataCoverageScore: 80,
          freshnessScore: 80,
          activityScore: 70,
          liquidityScore: 5,
          positionSizeScore: 70,
          oversizedTradeSummary: { count: 0, roi: "0", winrate: "0" },
          dataValidation: { apiWindowLimited: false }
        }
      })
    );
    expect(result.finalScore).toBeLessThan(40);
    expect(result.classification).toBe("Avoid copying");
  });

  it("emits PROFITABLE_BUT_ILLIQUID warning when ROI is high and liquidity is moderately low", () => {
    const result = computeWalletRanking(
      baseInputs({
        simulator: {
          summary: { roi: "1.0", maxDrawdownPercent: "-0.05", winrate: "0.7", copiedTradeCount: 80, missedTradeCount: 0 },
          delaySensitivity: [
            { delaySeconds: 0, roi: "1.0" },
            { delaySeconds: 300, roi: "0.95" }
          ]
        },
        readiness: {
          readinessScore: 60,
          dataCoverageScore: 70,
          freshnessScore: 70,
          activityScore: 60,
          liquidityScore: 25,
          positionSizeScore: 60,
          oversizedTradeSummary: { count: 0, roi: "0", winrate: "0" },
          dataValidation: { apiWindowLimited: false }
        }
      })
    );
    const codes = result.warnings.map((w) => w.code);
    expect(codes).toContain("PROFITABLE_BUT_ILLIQUID");
  });

  it("rewards focused event concentration over scattered single-position events", () => {
    const focused = computeWalletRanking(
      baseInputs({
        positions: [
          { eventId: "ev-1", negativeRisk: false, snapshotSource: "snapshot", currentShares: "10" },
          { eventId: "ev-1", negativeRisk: false, snapshotSource: "snapshot", currentShares: "10" },
          { eventId: "ev-1", negativeRisk: false, snapshotSource: "snapshot", currentShares: "10" },
          { eventId: "ev-2", negativeRisk: false, snapshotSource: "snapshot", currentShares: "10" },
          { eventId: "ev-3", negativeRisk: false, snapshotSource: "snapshot", currentShares: "10" }
        ]
      })
    );
    const scattered = computeWalletRanking(
      baseInputs({
        positions: [
          { eventId: "ev-1", negativeRisk: false, snapshotSource: "snapshot", currentShares: "10" },
          { eventId: "ev-2", negativeRisk: false, snapshotSource: "snapshot", currentShares: "10" },
          { eventId: "ev-3", negativeRisk: false, snapshotSource: "snapshot", currentShares: "10" },
          { eventId: "ev-4", negativeRisk: false, snapshotSource: "snapshot", currentShares: "10" },
          { eventId: "ev-5", negativeRisk: false, snapshotSource: "snapshot", currentShares: "10" }
        ]
      })
    );
    expect((focused.components.categoryFocus.score ?? 0)).toBeGreaterThan(
      scattered.components.categoryFocus.score ?? 0
    );
  });
});
