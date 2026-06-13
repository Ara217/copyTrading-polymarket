import Decimal from "decimal.js";
import {
  classifyOversizedTrades,
  type AnalyticsTrade,
  type CopyReadinessConfig,
  type MarketPrice,
  type TradePositionEffect,
  type TradeSide
} from "./index.js";

export interface CopySimulationMarket {
  marketId: string;
  category?: string | null;
  resolved?: boolean;
}

export interface CopySimulationSettings {
  startingBalance: string;
  copyPercentage: string;
  fixedCopyAmount: string | null;
  maxPositionSize: string | null;
  minPositionSize: string;
  maxMarketExposure: string | null;
  maxTotalExposure: string | null;
  delaySeconds: number;
  allowedActions: TradePositionEffect[];
  includeCategories: string[];
  excludeCategories: string[];
  includeUnresolvedMarkets: boolean;
  liquidityFilterEnabled: boolean;
  excludeOversizedTrades: boolean;
  oversizedConfig: Partial<CopyReadinessConfig> | null;
  drawdownStopPercent: string | null;
}

export interface CopyPriceHistoryPoint {
  t: number; // epoch milliseconds
  p: string; // midpoint price at t
}

export interface CopyPriceHistorySeries {
  marketId: string;
  outcome: string;
  points: CopyPriceHistoryPoint[];
}

export type FillMethod = "actual" | "history" | "slippage";

export interface CopySimulationInput {
  trades: AnalyticsTrade[];
  markets?: CopySimulationMarket[];
  marketPrices?: MarketPrice[];
  priceHistory?: CopyPriceHistorySeries[];
  settings?: Partial<CopySimulationSettings>;
}

export type MissedTradeReason =
  | "ACTION_FILTERED"
  | "CATEGORY_EXCLUDED"
  | "UNRESOLVED_MARKET_EXCLUDED"
  | "OVERSIZED_TRADE"
  | "LIQUIDITY_FILTERED"
  | "DRAWDOWN_STOP"
  | "BELOW_MIN_SIZE"
  | "MAX_POSITION_SIZE"
  | "MAX_MARKET_EXPOSURE"
  | "MAX_TOTAL_EXPOSURE"
  | "INSUFFICIENT_BALANCE"
  | "NOTHING_TO_REDUCE";

export interface SimulatedCopyTrade {
  sourceTradeId: string;
  marketId: string;
  conditionId: string;
  outcome: string;
  action: TradePositionEffect;
  side: TradeSide;
  traderTimestamp: string;
  executedAt: string;
  executionPrice: string;
  fillMethod: FillMethod;
  shares: string;
  value: string;
  realizedPnl: string;
  cashAfter: string;
  openExposureAfter: string;
}

export interface MissedCopyTrade {
  sourceTradeId: string;
  marketId: string;
  conditionId: string;
  outcome: string;
  action: TradePositionEffect;
  timestamp: string;
  reason: MissedTradeReason;
  detail: string;
}

export interface CopyEquityPoint {
  date: string;
  cash: string;
  openExposure: string;
  equity: string;
}

export interface CopyCategoryBreakdown {
  category: string;
  copiedTradeCount: number;
  missedTradeCount: number;
  volume: string;
  realizedPnl: string;
}

export interface CopySimulationSummary {
  startingBalance: string;
  endingCash: string;
  openPositionValue: string;
  endingEquity: string;
  realizedPnl: string;
  unrealizedPnl: string;
  totalPnl: string;
  roi: string;
  winrate: string;
  copiedTradeCount: number;
  closedCopyTradeCount: number;
  missedTradeCount: number;
  missedReasonCounts: Record<string, number>;
  fillMethodCounts: Record<string, number>;
  maxDrawdown: string;
  maxDrawdownPercent: string;
  drawdownStopTriggered: boolean;
}

export interface CopySimulationResult {
  settings: CopySimulationSettings;
  summary: CopySimulationSummary;
  ledger: SimulatedCopyTrade[];
  missedTrades: MissedCopyTrade[];
  equityCurve: CopyEquityPoint[];
  categoryBreakdown: CopyCategoryBreakdown[];
}

export interface DelaySensitivityPoint {
  delaySeconds: number;
  roi: string;
  totalPnl: string;
  copiedTradeCount: number;
  missedTradeCount: number;
}

const defaultSettings: CopySimulationSettings = {
  startingBalance: "1000",
  copyPercentage: "0.1",
  fixedCopyAmount: null,
  maxPositionSize: null,
  minPositionSize: "5",
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
};

interface CopierPosition {
  marketId: string;
  conditionId: string;
  outcome: string;
  shares: Decimal;
  costBasis: Decimal;
}

// Adverse price drift per minute of delay, used only as a fallback when no real CLOB
// price history is available for a market. Conservative and intentionally small; a
// modeled estimate, never presented as a real fill (ledger rows carry fillMethod).
const DELAY_SLIPPAGE_PER_MINUTE = new Decimal("0.001");
const MIN_PROBABILITY = new Decimal("0.0001");
const MAX_PROBABILITY = new Decimal("0.9999");

function decimal(value: string | number | Decimal): Decimal {
  return new Decimal(value);
}

/**
 * Linearly interpolate a midpoint price timeseries to `targetMs`. Points must be
 * sorted ascending by `t`. Clamps to the nearest endpoint outside the range; returns
 * null for an empty series.
 */
export function interpolatePrice(points: CopyPriceHistoryPoint[], targetMs: number): Decimal | null {
  if (points.length === 0) {
    return null;
  }
  if (targetMs <= points[0]!.t) {
    return decimal(points[0]!.p);
  }
  const last = points[points.length - 1]!;
  if (targetMs >= last.t) {
    return decimal(last.p);
  }

  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid]!.t <= targetMs) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const a = points[lo]!;
  const b = points[hi]!;
  const span = b.t - a.t;
  if (span <= 0) {
    return decimal(a.p);
  }
  const ratio = new Decimal(targetMs - a.t).div(span);
  const pa = decimal(a.p);
  return pa.plus(decimal(b.p).minus(pa).mul(ratio));
}

function applyDelaySlippage(sourcePrice: Decimal, side: TradeSide, delaySeconds: number): Decimal {
  const factor = DELAY_SLIPPAGE_PER_MINUTE.mul(new Decimal(delaySeconds).div(60));
  const moved = side === "buy" ? sourcePrice.mul(new Decimal(1).plus(factor)) : sourcePrice.mul(new Decimal(1).minus(factor));
  return Decimal.max(MIN_PROBABILITY, Decimal.min(MAX_PROBABILITY, moved));
}

function money(value: Decimal): string {
  return value.toDecimalPlaces(8).toString();
}

function normalizedSide(trade: AnalyticsTrade): TradeSide {
  const side = trade.side?.toLowerCase();
  if (side === "sell" || side === "sold" || side === "ask") {
    return "sell";
  }
  return "buy";
}

function positionKey(trade: Pick<AnalyticsTrade, "marketId" | "outcome">): string {
  return `${trade.marketId}:${trade.outcome}`;
}

function tradeValue(trade: AnalyticsTrade): Decimal {
  return decimal(trade.price).mul(decimal(trade.size).abs());
}

export function normalizeCopySimulationSettings(
  settings: Partial<CopySimulationSettings> = {}
): CopySimulationSettings {
  return {
    ...defaultSettings,
    ...settings,
    allowedActions:
      settings.allowedActions && settings.allowedActions.length > 0
        ? settings.allowedActions
        : defaultSettings.allowedActions,
    includeCategories: settings.includeCategories ?? [],
    excludeCategories: settings.excludeCategories ?? []
  };
}

export function simulateCopyTrading(input: CopySimulationInput): CopySimulationResult {
  const settings = normalizeCopySimulationSettings(input.settings);
  const trades = [...input.trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const markets = input.markets ?? [];
  const categoryByMarketId = new Map(markets.map((market) => [market.marketId, market.category ?? "Unknown"]));
  const resolvedByMarketId = new Map(markets.map((market) => [market.marketId, market.resolved]));
  const oversizedTradeIds = settings.excludeOversizedTrades
    ? new Set(classifyOversizedTrades(trades, settings.oversizedConfig ?? {}).map((trade) => trade.tradeId))
    : new Set<string>();
  const historyByKey = new Map<string, CopyPriceHistoryPoint[]>();
  for (const series of input.priceHistory ?? []) {
    historyByKey.set(
      `${series.marketId}:${series.outcome}`,
      [...series.points].sort((a, b) => a.t - b.t)
    );
  }

  const startingBalance = decimal(settings.startingBalance);
  const minPositionSize = decimal(settings.minPositionSize);
  let cash = startingBalance;
  let realizedCumulative = new Decimal(0);
  let peakEquity = startingBalance;
  let maxDrawdown = new Decimal(0);
  let maxDrawdownPercent = new Decimal(0);
  let drawdownStopTriggered = false;

  const traderPositions = new Map<string, Decimal>();
  const copierPositions = new Map<string, CopierPosition>();
  const ledger: SimulatedCopyTrade[] = [];
  const missedTrades: MissedCopyTrade[] = [];
  const equityByDate = new Map<string, CopyEquityPoint>();
  const categoryStats = new Map<
    string,
    { copiedTradeCount: number; missedTradeCount: number; volume: Decimal; realizedPnl: Decimal }
  >();

  const openExposure = (): Decimal =>
    [...copierPositions.values()].reduce((sum, position) => sum.plus(position.costBasis), new Decimal(0));

  const marketExposure = (marketId: string): Decimal =>
    [...copierPositions.entries()]
      .filter(([key]) => key.startsWith(`${marketId}:`))
      .reduce((sum, [, position]) => sum.plus(position.costBasis), new Decimal(0));

  const categoryFor = (trade: AnalyticsTrade): string =>
    categoryByMarketId.get(trade.conditionId || trade.marketId) ??
    categoryByMarketId.get(trade.marketId) ??
    "Unknown";

  const categoryBucket = (category: string) => {
    const bucket =
      categoryStats.get(category) ??
      ({ copiedTradeCount: 0, missedTradeCount: 0, volume: new Decimal(0), realizedPnl: new Decimal(0) });
    categoryStats.set(category, bucket);
    return bucket;
  };

  const recordEquityPoint = (timestamp: string) => {
    const date = new Date(timestamp).toISOString().slice(0, 10);
    const exposure = openExposure();
    equityByDate.set(date, {
      date,
      cash: money(cash),
      openExposure: money(exposure),
      equity: money(startingBalance.plus(realizedCumulative))
    });
  };

  const recordDrawdown = () => {
    const equity = startingBalance.plus(realizedCumulative);
    peakEquity = Decimal.max(peakEquity, equity);
    const drawdown = peakEquity.minus(equity);
    maxDrawdown = Decimal.max(maxDrawdown, drawdown);
    const drawdownPercent = peakEquity.gt(0) ? drawdown.div(peakEquity) : new Decimal(0);
    maxDrawdownPercent = Decimal.max(maxDrawdownPercent, drawdownPercent);
    if (
      settings.drawdownStopPercent !== null &&
      drawdownPercent.gte(settings.drawdownStopPercent) &&
      drawdownPercent.gt(0)
    ) {
      drawdownStopTriggered = true;
    }
  };

  const miss = (trade: AnalyticsTrade, action: TradePositionEffect, reason: MissedTradeReason, detail: string) => {
    missedTrades.push({
      sourceTradeId: trade.id,
      marketId: trade.marketId,
      conditionId: trade.conditionId,
      outcome: trade.outcome,
      action,
      timestamp: trade.timestamp,
      reason,
      detail
    });
    categoryBucket(categoryFor(trade)).missedTradeCount += 1;
  };

  // Delay fill strategy: at delay 0 the copier fills at the trader's price (actual).
  // With delay, prefer the real market midpoint interpolated from CLOB price history;
  // when no history is available for the market, fall back to a modeled slippage estimate.
  const executionFor = (
    trade: AnalyticsTrade,
    side: TradeSide
  ): { executedAt: string; price: Decimal; method: FillMethod } => {
    const executedAtMs = new Date(trade.timestamp).getTime() + settings.delaySeconds * 1000;
    const executedAt = new Date(executedAtMs).toISOString();
    const source = decimal(trade.price);

    if (settings.delaySeconds === 0) {
      return { executedAt, price: source, method: "actual" };
    }

    const points = historyByKey.get(positionKey(trade));
    if (points && points.length > 0) {
      const interpolated = interpolatePrice(points, executedAtMs);
      if (interpolated && interpolated.gt(0)) {
        return { executedAt, price: interpolated, method: "history" };
      }
    }

    return { executedAt, price: applyDelaySlippage(source, side, settings.delaySeconds), method: "slippage" };
  };

  for (const trade of trades) {
    const key = positionKey(trade);
    const side = normalizedSide(trade);
    const traderShares = traderPositions.get(key) ?? new Decimal(0);
    const action: TradePositionEffect =
      side === "buy"
        ? traderShares.gt(0)
          ? "add"
          : "entry"
        : traderShares.minus(Decimal.min(decimal(trade.size).abs(), traderShares)).isZero()
          ? "close"
          : "reduce";

    // Advance the trader's own position before evaluating the copier's action.
    if (side === "buy") {
      traderPositions.set(key, traderShares.plus(decimal(trade.size).abs()));
    } else {
      traderPositions.set(key, traderShares.minus(Decimal.min(decimal(trade.size).abs(), traderShares)));
    }

    if (!settings.allowedActions.includes(action)) {
      miss(trade, action, "ACTION_FILTERED", `Trader action "${action}" is outside the allowed action set.`);
      continue;
    }

    if (side === "sell") {
      const copierPosition = copierPositions.get(key);
      if (!copierPosition || copierPosition.shares.lte(0) || traderShares.lte(0)) {
        miss(trade, action, "NOTHING_TO_REDUCE", "The simulated copier holds no shares to reduce for this position.");
        continue;
      }

      const sharesToClose = Decimal.min(decimal(trade.size).abs(), traderShares);
      const proportion = sharesToClose.div(traderShares);
      const copierShares = copierPosition.shares.mul(proportion);
      const averageEntry = copierPosition.shares.gt(0)
        ? copierPosition.costBasis.div(copierPosition.shares)
        : new Decimal(0);
      const { executedAt, price, method } = executionFor(trade, side);
      const proceeds = price.mul(copierShares);
      const realizedPnl = price.minus(averageEntry).mul(copierShares);

      copierPosition.shares = copierPosition.shares.minus(copierShares);
      copierPosition.costBasis = copierPosition.costBasis.minus(averageEntry.mul(copierShares));
      if (copierPosition.shares.lte(0)) {
        copierPositions.delete(key);
      }
      cash = cash.plus(proceeds);
      realizedCumulative = realizedCumulative.plus(realizedPnl);

      ledger.push({
        sourceTradeId: trade.id,
        marketId: trade.marketId,
        conditionId: trade.conditionId,
        outcome: trade.outcome,
        action,
        side,
        traderTimestamp: trade.timestamp,
        executedAt,
        executionPrice: money(price),
        fillMethod: method,
        shares: money(copierShares),
        value: money(proceeds),
        realizedPnl: money(realizedPnl),
        cashAfter: money(cash),
        openExposureAfter: money(openExposure())
      });
      const bucket = categoryBucket(categoryFor(trade));
      bucket.copiedTradeCount += 1;
      bucket.volume = bucket.volume.plus(proceeds);
      bucket.realizedPnl = bucket.realizedPnl.plus(realizedPnl);
      recordDrawdown();
      recordEquityPoint(trade.timestamp);
      continue;
    }

    const category = categoryFor(trade);
    if (settings.excludeCategories.includes(category)) {
      miss(trade, action, "CATEGORY_EXCLUDED", `Category "${category}" is excluded by the simulation settings.`);
      continue;
    }
    if (settings.includeCategories.length > 0 && !settings.includeCategories.includes(category)) {
      miss(trade, action, "CATEGORY_EXCLUDED", `Category "${category}" is not in the included category list.`);
      continue;
    }
    if (!settings.includeUnresolvedMarkets) {
      const resolved = resolvedByMarketId.get(trade.conditionId || trade.marketId) ?? resolvedByMarketId.get(trade.marketId);
      if (resolved === false) {
        miss(trade, action, "UNRESOLVED_MARKET_EXCLUDED", "Unresolved markets are excluded by the simulation settings.");
        continue;
      }
    }
    if (oversizedTradeIds.has(trade.id)) {
      miss(trade, action, "OVERSIZED_TRADE", "The trader's trade is classified as oversized for the copy strategy.");
      continue;
    }

    const traderValue = tradeValue(trade);
    const desiredValue = settings.fixedCopyAmount
      ? decimal(settings.fixedCopyAmount)
      : traderValue.mul(settings.copyPercentage);

    if (settings.liquidityFilterEnabled && desiredValue.gt(traderValue)) {
      miss(
        trade,
        action,
        "LIQUIDITY_FILTERED",
        "The desired copy size exceeds the observed trade notional, so a realistic fill is unlikely."
      );
      continue;
    }
    if (drawdownStopTriggered) {
      miss(trade, action, "DRAWDOWN_STOP", "Copying stopped after the configured drawdown threshold was reached.");
      continue;
    }
    if (desiredValue.lt(minPositionSize)) {
      miss(trade, action, "BELOW_MIN_SIZE", "The computed copy size is below the configured minimum position size.");
      continue;
    }

    const copierPosition = copierPositions.get(key) ?? {
      marketId: trade.marketId,
      conditionId: trade.conditionId,
      outcome: trade.outcome,
      shares: new Decimal(0),
      costBasis: new Decimal(0)
    };
    const caps: Array<{ reason: MissedTradeReason; remaining: Decimal }> = [];
    if (settings.maxPositionSize !== null) {
      caps.push({
        reason: "MAX_POSITION_SIZE",
        remaining: Decimal.max(0, decimal(settings.maxPositionSize).minus(copierPosition.costBasis))
      });
    }
    if (settings.maxMarketExposure !== null) {
      caps.push({
        reason: "MAX_MARKET_EXPOSURE",
        remaining: Decimal.max(0, decimal(settings.maxMarketExposure).minus(marketExposure(trade.marketId)))
      });
    }
    if (settings.maxTotalExposure !== null) {
      caps.push({
        reason: "MAX_TOTAL_EXPOSURE",
        remaining: Decimal.max(0, decimal(settings.maxTotalExposure).minus(openExposure()))
      });
    }
    caps.push({ reason: "INSUFFICIENT_BALANCE", remaining: Decimal.max(0, cash) });

    const bindingCap = caps.reduce((current, cap) => (cap.remaining.lt(current.remaining) ? cap : current));
    const cappedValue = Decimal.min(desiredValue, bindingCap.remaining);

    if (cappedValue.lt(minPositionSize)) {
      miss(
        trade,
        action,
        bindingCap.reason,
        "The copy size left after applying limits is below the configured minimum position size."
      );
      continue;
    }

    const { executedAt, price, method } = executionFor(trade, side);
    if (price.lte(0)) {
      miss(trade, action, "BELOW_MIN_SIZE", "No usable execution price was available for this trade.");
      continue;
    }
    const shares = cappedValue.div(price);

    copierPosition.shares = copierPosition.shares.plus(shares);
    copierPosition.costBasis = copierPosition.costBasis.plus(cappedValue);
    copierPositions.set(key, copierPosition);
    cash = cash.minus(cappedValue);

    ledger.push({
      sourceTradeId: trade.id,
      marketId: trade.marketId,
      conditionId: trade.conditionId,
      outcome: trade.outcome,
      action,
      side,
      traderTimestamp: trade.timestamp,
      executedAt,
      executionPrice: money(price),
      fillMethod: method,
      shares: money(shares),
      value: money(cappedValue),
      realizedPnl: "0",
      cashAfter: money(cash),
      openExposureAfter: money(openExposure())
    });
    const bucket = categoryBucket(category);
    bucket.copiedTradeCount += 1;
    bucket.volume = bucket.volume.plus(cappedValue);
    recordDrawdown();
    recordEquityPoint(trade.timestamp);
  }

  const marketPrices = input.marketPrices ?? [];
  let openPositionValue = new Decimal(0);
  let openCostBasis = new Decimal(0);
  for (const position of copierPositions.values()) {
    openCostBasis = openCostBasis.plus(position.costBasis);
    openPositionValue = openPositionValue.plus(markPrice(position, marketPrices).mul(position.shares));
  }

  const realizedPnl = realizedCumulative;
  const unrealizedPnl = openPositionValue.minus(openCostBasis);
  const totalPnl = realizedPnl.plus(unrealizedPnl);
  const closedCopyTrades = ledger.filter((entry) => entry.side === "sell");
  const winningClosedTrades = closedCopyTrades.filter((entry) => decimal(entry.realizedPnl).gt(0)).length;
  const missedReasonCounts: Record<string, number> = {};
  for (const missed of missedTrades) {
    missedReasonCounts[missed.reason] = (missedReasonCounts[missed.reason] ?? 0) + 1;
  }
  const fillMethodCounts: Record<string, number> = {};
  for (const entry of ledger) {
    fillMethodCounts[entry.fillMethod] = (fillMethodCounts[entry.fillMethod] ?? 0) + 1;
  }

  return {
    settings,
    summary: {
      startingBalance: money(startingBalance),
      endingCash: money(cash),
      openPositionValue: money(openPositionValue),
      endingEquity: money(cash.plus(openPositionValue)),
      realizedPnl: money(realizedPnl),
      unrealizedPnl: money(unrealizedPnl),
      totalPnl: money(totalPnl),
      roi: startingBalance.isZero() ? "0" : money(totalPnl.div(startingBalance)),
      winrate:
        closedCopyTrades.length === 0 ? "0" : money(new Decimal(winningClosedTrades).div(closedCopyTrades.length)),
      copiedTradeCount: ledger.length,
      closedCopyTradeCount: closedCopyTrades.length,
      missedTradeCount: missedTrades.length,
      missedReasonCounts,
      fillMethodCounts,
      maxDrawdown: money(maxDrawdown),
      maxDrawdownPercent: money(maxDrawdownPercent),
      drawdownStopTriggered
    },
    ledger,
    missedTrades,
    equityCurve: [...equityByDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    categoryBreakdown: [...categoryStats.entries()]
      .map(([category, stats]) => ({
        category,
        copiedTradeCount: stats.copiedTradeCount,
        missedTradeCount: stats.missedTradeCount,
        volume: money(stats.volume),
        realizedPnl: money(stats.realizedPnl)
      }))
      .sort((a, b) => decimal(b.volume).cmp(a.volume) || a.category.localeCompare(b.category))
  };
}

export function simulateDelaySensitivity(
  input: CopySimulationInput,
  delays: number[]
): DelaySensitivityPoint[] {
  return delays.map((delaySeconds) => {
    const result = simulateCopyTrading({
      ...input,
      settings: { ...input.settings, delaySeconds }
    });

    return {
      delaySeconds,
      roi: result.summary.roi,
      totalPnl: result.summary.totalPnl,
      copiedTradeCount: result.summary.copiedTradeCount,
      missedTradeCount: result.summary.missedTradeCount
    };
  });
}

function markPrice(position: CopierPosition, marketPrices: MarketPrice[]): Decimal {
  const marketPrice = marketPrices.find(
    (price) =>
      (price.marketId === position.marketId || price.marketId === position.conditionId) &&
      price.outcome === position.outcome
  );

  if (!marketPrice) {
    // Without a market price snapshot, fall back to cost so unrealized PnL stays at zero.
    return position.shares.gt(0) ? position.costBasis.div(position.shares) : new Decimal(0);
  }
  if (marketPrice.resolved) {
    return marketPrice.winningOutcome === position.outcome ? new Decimal(1) : new Decimal(0);
  }
  return decimal(marketPrice.price);
}
