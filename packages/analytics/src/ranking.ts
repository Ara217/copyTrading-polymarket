import Decimal from "decimal.js";

// V5 copyability ranking. Weights documented in docs/DECISIONS.md "V5 Ranking Weights".
// Null components redistribute their weight to dataConfidence (never to other components),
// so wallets with thin evidence cannot game the score by missing a dimension.

export const WEIGHTS_VERSION = "v5.1-2026-06-19";

export interface RankingWeights {
  simulatedRoi: number;
  drawdown: number;
  consistency: number;
  recentPerformance: number;
  liquidity: number;
  dataConfidence: number;
  activity: number;
  delayTolerance: number;
  oversizedRisk: number;
  categoryFocus: number;
}

export const DEFAULT_WEIGHTS: RankingWeights = {
  simulatedRoi: 22,
  drawdown: 15,
  consistency: 12,
  recentPerformance: 10,
  liquidity: 10,
  dataConfidence: 8,
  activity: 7,
  delayTolerance: 6,
  oversizedRisk: 5,
  categoryFocus: 5
};

export type RankingClassification =
  | "Prime copy candidate"
  | "Strong copy candidate"
  | "Watchlist candidate"
  | "High-risk candidate"
  | "Avoid copying";

export interface RankingWarning {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface RankingInputs {
  metrics: {
    totalPnl: string;
    realizedPnl: string;
    unrealizedPnl: string;
    roi: string;
    tradeWinrate: string;
    marketWinrate: string;
    maxDrawdown: string;
    currentDrawdown: string;
    longestWinStreak: number;
    longestLossStreak: number;
    tradeCount: number;
    volume: string;
    profitDistributionJson: unknown;
    winLossChartJson: unknown;
  } | null;
  readiness: {
    readinessScore: number;
    dataCoverageScore: number;
    freshnessScore: number;
    activityScore: number;
    liquidityScore: number;
    positionSizeScore: number;
    oversizedTradeSummary: { count: number; roi: string; winrate: string } | null;
    dataValidation?: { apiWindowLimited?: boolean } | null;
  } | null;
  simulator: {
    summary: {
      roi: string;
      maxDrawdownPercent: string;
      winrate: string;
      copiedTradeCount: number;
      missedTradeCount: number;
    };
    delaySensitivity: Array<{ delaySeconds: number; roi: string }>;
    fillMethodCounts?: Record<string, number>;
  } | null;
  positions: Array<{
    eventId: string | null;
    negativeRisk: boolean | null;
    snapshotSource: string | null;
    currentShares: string;
  }>;
  snapshotChecked: boolean;
  profile: {
    copyBalance: string;
    maxPositionSize: string;
    delaySeconds: number;
    includedCategories: string[];
  };
}

export interface RankingComponent {
  score: number | null;
  weight: number;
  detail?: string;
}

export interface RankingResult {
  components: {
    simulatedRoi: RankingComponent;
    drawdown: RankingComponent;
    consistency: RankingComponent;
    recentPerformance: RankingComponent;
    liquidity: RankingComponent;
    dataConfidence: RankingComponent;
    activity: RankingComponent;
    delayTolerance: RankingComponent;
    oversizedRisk: RankingComponent;
    categoryFocus: RankingComponent;
  };
  finalScore: number;
  classification: RankingClassification;
  warnings: RankingWarning[];
  weightsVersion: string;
  profile: RankingInputs["profile"];
}

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));
const roundScore = (value: number): number => Math.round(clamp(value));

function dec(value: string | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

// ---- component scorers ----

function scoreSimulatedRoi(roi: string | null): number | null {
  if (roi === null) return null;
  // -1 (=-100%) → 0; 0 → 30; +0.5 → 80; +1.0+ → 100. Linear within ranges.
  const r = dec(roi).toNumber();
  if (!Number.isFinite(r)) return null;
  if (r <= -1) return 0;
  if (r <= 0) return clamp(30 + (r * 30)); // r in (-1,0]: 0..30
  if (r <= 0.5) return clamp(30 + r * 100); // r in (0,0.5]: 30..80
  if (r <= 1) return clamp(80 + (r - 0.5) * 40); // r in (0.5,1]: 80..100
  return 100;
}

function scoreDrawdown(drawdownPercent: string | null): number | null {
  if (drawdownPercent === null) return null;
  // Drawdown is a non-positive percent value (e.g. "-0.25" = -25%). Treat magnitude.
  const mag = dec(drawdownPercent).abs().toNumber();
  if (!Number.isFinite(mag)) return null;
  // 0% → 100; 10% → 80; 30% → 50; 50%+ → 0. Linear in 0..50.
  return clamp(100 - mag * 200);
}

function scoreConsistency(tradeWinrate: string, longestLossStreak: number, tradeCount: number): number {
  // Winrate dominates; long loss streaks penalize; very low sample (<20) caps the score.
  const wr = clamp(dec(tradeWinrate).mul(100).toNumber(), 0, 100);
  const streakPenalty = Math.min(longestLossStreak * 3, 30);
  const sampleCap = tradeCount < 20 ? 60 : tradeCount < 50 ? 80 : 100;
  return clamp(Math.min(wr - streakPenalty + 30, sampleCap));
}

function scoreRecentPerformance(winLossChartJson: unknown): number | null {
  if (!Array.isArray(winLossChartJson) || winLossChartJson.length === 0) return null;
  const tail = winLossChartJson.slice(-30) as Array<{ wins?: number; losses?: number }>;
  let wins = 0;
  let losses = 0;
  for (const point of tail) {
    if (typeof point?.wins === "number") wins += point.wins;
    if (typeof point?.losses === "number") losses += point.losses;
  }
  const total = wins + losses;
  if (total === 0) return null;
  const ratio = wins / total;
  // 0 → 0, 0.5 → 50, 1 → 100. Linear.
  return clamp(ratio * 100);
}

function scoreLiquidity(readinessLiquidity: number | undefined): number | null {
  if (readinessLiquidity === undefined || readinessLiquidity === null) return null;
  return clamp(readinessLiquidity);
}

function scoreDataConfidence(
  readiness: RankingInputs["readiness"],
  snapshotChecked: boolean,
  tradeCount: number
): number {
  if (!readiness) return snapshotChecked ? 40 : 20;
  const coverage = clamp(readiness.dataCoverageScore);
  const freshness = clamp(readiness.freshnessScore);
  const snapshotBonus = snapshotChecked ? 100 : 60;
  const sample = tradeCount >= 100 ? 100 : tradeCount >= 30 ? 75 : 40;
  return clamp(coverage * 0.4 + freshness * 0.25 + snapshotBonus * 0.2 + sample * 0.15);
}

function scoreActivity(readinessActivity: number | undefined): number | null {
  if (readinessActivity === undefined || readinessActivity === null) return null;
  return clamp(readinessActivity);
}

function scoreDelayTolerance(
  delaySensitivity: Array<{ delaySeconds: number; roi: string }> | null
): number | null {
  if (!delaySensitivity || delaySensitivity.length < 2) return null;
  const zero = delaySensitivity.find((p) => p.delaySeconds === 0);
  const mid = delaySensitivity.find((p) => p.delaySeconds === 300) ?? delaySensitivity[delaySensitivity.length - 1];
  if (!zero || !mid) return null;
  const zeroRoi = dec(zero.roi).toNumber();
  const midRoi = dec(mid.roi).toNumber();
  if (!Number.isFinite(zeroRoi) || !Number.isFinite(midRoi)) return null;
  const baseline = Math.max(Math.abs(zeroRoi), 0.01);
  const degradation = (zeroRoi - midRoi) / baseline;
  // 0% degradation → 100; 50% degradation → 50; 100%+ degradation → 0.
  return clamp(100 - degradation * 100);
}

function scoreOversizedRisk(
  oversized: RankingInputs["readiness"] extends infer R ? R extends null ? null : R extends { oversizedTradeSummary: infer O } ? O : null : null,
  positions: RankingInputs["positions"]
): number | null {
  const count = oversized && typeof oversized === "object" && oversized !== null && "count" in oversized ? (oversized as { count: number }).count : 0;
  const negRiskShare = positions.length === 0
    ? 0
    : positions.filter((p) => p.negativeRisk === true && dec(p.currentShares).gt(0)).length / positions.length;
  // 0 oversized + 0 neg-risk → 100; many oversized or heavy neg-risk → penalize.
  return clamp(100 - count * 8 - negRiskShare * 30);
}

function scoreCategoryFocus(positions: RankingInputs["positions"]): number | null {
  const active = positions.filter((p) => dec(p.currentShares).gt(0));
  if (active.length === 0) return null;
  const byEvent = new Map<string, number>();
  for (const p of active) {
    const key = p.eventId ?? "_no-event";
    byEvent.set(key, (byEvent.get(key) ?? 0) + 1);
  }
  const top = Math.max(...byEvent.values());
  const share = top / active.length;
  // 30-70% top-event share = ideal focus → 100. 0% or 100% concentration → penalize.
  if (share <= 0.3) return clamp(share / 0.3 * 80);
  if (share <= 0.7) return clamp(80 + (share - 0.3) * 50);
  if (share <= 0.9) return clamp(100 - (share - 0.7) * 200); // 0.7 → 100, 0.9 → 60
  return clamp(60 - (share - 0.9) * 500); // 0.9 → 60, 1.0 → 10
}

// ---- classification + warnings ----

function classify(finalScore: number): RankingClassification {
  if (finalScore < 40) return "Avoid copying";
  if (finalScore < 60) return "High-risk candidate";
  if (finalScore < 80) return "Watchlist candidate";
  if (finalScore < 90) return "Strong copy candidate";
  return "Prime copy candidate";
}

function buildWarnings(
  components: RankingResult["components"],
  inputs: RankingInputs
): RankingWarning[] {
  const warnings: RankingWarning[] = [];
  const sim = components.simulatedRoi.score;
  const liq = components.liquidity.score;
  const dc = components.dataConfidence.score;
  const dd = components.drawdown.score;

  if (sim !== null && sim >= 80 && liq !== null && liq < 30) {
    warnings.push({
      code: "PROFITABLE_BUT_ILLIQUID",
      severity: "warning",
      message: "High simulated ROI but liquidity is thin — a copier's actual fills will diverge from the trader's prices."
    });
  }
  if (sim !== null && sim >= 80 && dc !== null && dc < 50) {
    warnings.push({
      code: "PROFITABLE_BUT_LOW_CONFIDENCE",
      severity: "warning",
      message: "High simulated ROI but data confidence is low (sparse trades, partial sync, or no /positions cross-check)."
    });
  }
  if (sim !== null && sim >= 70 && dd !== null && dd < 40) {
    warnings.push({
      code: "HIGH_DRAWDOWN_DESPITE_RETURNS",
      severity: "warning",
      message: "Strong simulated returns came with significant drawdown — a copier would have felt real pain."
    });
  }
  if (inputs.simulator === null) {
    warnings.push({
      code: "NO_SIMULATOR_RUN",
      severity: "info",
      message: "No copy-trading simulation has been run for this wallet yet — ROI and delay components are unavailable."
    });
  }
  if (inputs.metrics && inputs.metrics.tradeCount < 20) {
    warnings.push({
      code: "THIN_EVIDENCE",
      severity: "warning",
      message: `Only ${inputs.metrics.tradeCount} trade(s) recorded — score is best treated as provisional.`
    });
  }
  if (inputs.readiness?.dataValidation?.apiWindowLimited) {
    warnings.push({
      code: "API_WINDOW_LIMITED",
      severity: "info",
      message: "Wallet history is at the public Data API window. Lifetime conclusions are incomplete."
    });
  }
  if (!inputs.snapshotChecked) {
    warnings.push({
      code: "SNAPSHOT_UNCHECKED",
      severity: "info",
      message: "Reconstruction was not cross-checked against /positions in this refresh."
    });
  }
  return warnings;
}

// ---- main entry ----

export function computeWalletRanking(inputs: RankingInputs, weights: RankingWeights = DEFAULT_WEIGHTS): RankingResult {
  const tradeCount = inputs.metrics?.tradeCount ?? 0;
  const simulatedRoi = scoreSimulatedRoi(inputs.simulator?.summary.roi ?? null);
  const drawdown = inputs.simulator
    ? scoreDrawdown(inputs.simulator.summary.maxDrawdownPercent)
    : inputs.metrics
      ? scoreDrawdown(inputs.metrics.maxDrawdown)
      : null;
  const consistency = inputs.metrics
    ? scoreConsistency(inputs.metrics.tradeWinrate, inputs.metrics.longestLossStreak, tradeCount)
    : null;
  const recent = scoreRecentPerformance(inputs.metrics?.winLossChartJson ?? null);
  const liquidity = scoreLiquidity(inputs.readiness?.liquidityScore);
  const dataConfidence = scoreDataConfidence(inputs.readiness, inputs.snapshotChecked, tradeCount);
  const activity = scoreActivity(inputs.readiness?.activityScore);
  const delayTol = scoreDelayTolerance(inputs.simulator?.delaySensitivity ?? null);
  const oversizedRisk = scoreOversizedRisk(inputs.readiness?.oversizedTradeSummary ?? null, inputs.positions);
  const categoryFocus = scoreCategoryFocus(inputs.positions);

  const componentRaw: Array<{ key: keyof RankingWeights; score: number | null; weight: number }> = [
    { key: "simulatedRoi", score: simulatedRoi, weight: weights.simulatedRoi },
    { key: "drawdown", score: drawdown, weight: weights.drawdown },
    { key: "consistency", score: consistency, weight: weights.consistency },
    { key: "recentPerformance", score: recent, weight: weights.recentPerformance },
    { key: "liquidity", score: liquidity, weight: weights.liquidity },
    { key: "dataConfidence", score: dataConfidence, weight: weights.dataConfidence },
    { key: "activity", score: activity, weight: weights.activity },
    { key: "delayTolerance", score: delayTol, weight: weights.delayTolerance },
    { key: "oversizedRisk", score: oversizedRisk, weight: weights.oversizedRisk },
    { key: "categoryFocus", score: categoryFocus, weight: weights.categoryFocus }
  ];

  // Null component → redistribute weight to dataConfidence (never to other components).
  // dataConfidence is never null by construction.
  let dataConfidenceWeight = weights.dataConfidence;
  for (const c of componentRaw) {
    if (c.score === null && c.key !== "dataConfidence") {
      dataConfidenceWeight += c.weight;
    }
  }
  const finalWeighted = componentRaw.reduce((acc, c) => {
    if (c.score === null) return acc;
    const w = c.key === "dataConfidence" ? dataConfidenceWeight : c.weight;
    return acc + (c.score * w) / 100;
  }, 0);

  let finalScore = roundScore(finalWeighted);
  // Force "Avoid copying" classification if any critical signal completely failed.
  if (finalScore < 40 || (liquidity !== null && liquidity < 10) || (dataConfidence < 20)) {
    finalScore = Math.min(finalScore, 39);
  }

  const components: RankingResult["components"] = {
    simulatedRoi: { score: simulatedRoi === null ? null : roundScore(simulatedRoi), weight: weights.simulatedRoi },
    drawdown: { score: drawdown === null ? null : roundScore(drawdown), weight: weights.drawdown },
    consistency: { score: consistency === null ? null : roundScore(consistency), weight: weights.consistency },
    recentPerformance: { score: recent === null ? null : roundScore(recent), weight: weights.recentPerformance },
    liquidity: { score: liquidity === null ? null : roundScore(liquidity), weight: weights.liquidity },
    dataConfidence: { score: roundScore(dataConfidence), weight: dataConfidenceWeight, detail: dataConfidenceWeight > weights.dataConfidence ? "absorbed weight from null components" : undefined },
    activity: { score: activity === null ? null : roundScore(activity), weight: weights.activity },
    delayTolerance: { score: delayTol === null ? null : roundScore(delayTol), weight: weights.delayTolerance },
    oversizedRisk: { score: oversizedRisk === null ? null : roundScore(oversizedRisk), weight: weights.oversizedRisk },
    categoryFocus: { score: categoryFocus === null ? null : roundScore(categoryFocus), weight: weights.categoryFocus }
  };

  const warnings = buildWarnings(components, inputs);
  return {
    components,
    finalScore,
    classification: classify(finalScore),
    warnings,
    weightsVersion: WEIGHTS_VERSION,
    profile: inputs.profile
  };
}
