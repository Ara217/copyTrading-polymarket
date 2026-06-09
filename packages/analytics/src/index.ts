import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type TradeSide = "buy" | "sell";

export interface AnalyticsTrade {
  id: string;
  marketId: string;
  conditionId: string;
  outcome: string;
  price: string;
  size: string;
  timestamp: string;
  side?: string | null;
}

export interface MarketPrice {
  marketId: string;
  outcome: string;
  price: string;
  resolved?: boolean;
  winningOutcome?: string | null;
}

export interface ReconstructedPosition {
  marketId: string;
  conditionId: string;
  outcome: string;
  currentShares: string;
  averageEntryPrice: string;
  averageExitPrice: string;
  realizedPnl: string;
  unrealizedPnl: string;
  totalPnl: string;
  confidenceScore: number;
}

export interface WalletMetricResult {
  totalPnl: string;
  winrate: string;
  volume: string;
  drawdown: string;
  tradeCount: number;
}

export interface PnlPoint {
  date: string;
  dailyPnl: string;
  cumulativePnl: string;
}

export interface MarketResolution {
  marketId: string;
  resolved?: boolean;
}

export interface TradeHighlight {
  tradeId: string;
  marketId: string;
  conditionId: string;
  outcome: string;
  timestamp: string;
  pnl: string;
  price: string;
  size: string;
}

export interface ProfitDistributionBucket {
  bucket: string;
  count: number;
}

export interface WinLossPoint {
  date: string;
  wins: number;
  losses: number;
}

export interface DrawdownPoint {
  date: string;
  cumulativePnl: string;
  drawdown: string;
}

export type TradePositionEffect = "entry" | "add" | "reduce" | "close";
export type TradeResult = "open" | "win" | "loss" | "flat";

export interface TradeHistoryAnalytics {
  tradeId: string;
  side: TradeSide;
  positionEffect: TradePositionEffect;
  realizedPnl: string;
  result: TradeResult;
  remainingShares: string;
}

export interface AdvancedPerformanceResult {
  realizedPnl: string;
  unrealizedPnl: string;
  totalPnl: string;
  roi: string;
  tradeWinrate: string;
  marketWinrate: string;
  resolvedMarketWinrate: string;
  maxDrawdown: string;
  currentDrawdown: string;
  averageDrawdown: string;
  longestWinStreak: number;
  longestLossStreak: number;
  bestTrade: TradeHighlight | null;
  worstTrade: TradeHighlight | null;
  profitDistribution: ProfitDistributionBucket[];
  winLossChart: WinLossPoint[];
}

interface PositionAccumulator {
  marketId: string;
  conditionId: string;
  outcome: string;
  currentShares: Decimal;
  costBasis: Decimal;
  averageExitPriceTotal: Decimal;
  exitCount: Decimal;
  realizedPnl: Decimal;
  confidenceScore: number;
}

interface ClosedTradeResult {
  trade: AnalyticsTrade;
  pnl: Decimal;
}

function decimal(value: string | number | Decimal): Decimal {
  return new Decimal(value);
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

function priceForPosition(
  position: PositionAccumulator,
  marketPrices: MarketPrice[]
): Decimal {
  const marketPrice = marketPrices.find(
    (price) => price.marketId === position.marketId && price.outcome === position.outcome
  );

  if (!marketPrice) {
    return new Decimal(0);
  }

  if (marketPrice.resolved) {
    return marketPrice.winningOutcome === position.outcome ? new Decimal(1) : new Decimal(0);
  }

  return decimal(marketPrice.price);
}

export function reconstructPositions(
  trades: AnalyticsTrade[],
  marketPrices: MarketPrice[] = []
): ReconstructedPosition[] {
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const positions = new Map<string, PositionAccumulator>();

  for (const trade of sortedTrades) {
    const key = positionKey(trade);
    const existing = positions.get(key);
    const current =
      existing ??
      ({
        marketId: trade.marketId,
        conditionId: trade.conditionId,
        outcome: trade.outcome,
        currentShares: new Decimal(0),
        costBasis: new Decimal(0),
        averageExitPriceTotal: new Decimal(0),
        exitCount: new Decimal(0),
        realizedPnl: new Decimal(0),
        confidenceScore: trade.marketId && trade.conditionId ? 100 : 60
      } satisfies PositionAccumulator);

    const side = normalizedSide(trade);
    const price = decimal(trade.price);
    const size = decimal(trade.size).abs();

    if (side === "buy") {
      current.currentShares = current.currentShares.plus(size);
      current.costBasis = current.costBasis.plus(price.mul(size));
    } else {
      const sharesToClose = Decimal.min(size, current.currentShares);
      const averageEntry = current.currentShares.gt(0)
        ? current.costBasis.div(current.currentShares)
        : new Decimal(0);
      current.realizedPnl = current.realizedPnl.plus(price.minus(averageEntry).mul(sharesToClose));
      current.currentShares = current.currentShares.minus(sharesToClose);
      current.costBasis = current.costBasis.minus(averageEntry.mul(sharesToClose));
      current.averageExitPriceTotal = current.averageExitPriceTotal.plus(price);
      current.exitCount = current.exitCount.plus(1);

      if (size.gt(sharesToClose)) {
        current.confidenceScore = Math.min(current.confidenceScore, 80);
      }
    }

    positions.set(key, current);
  }

  return [...positions.values()].map((position) => {
    const currentPrice = priceForPosition(position, marketPrices);
    const unrealizedPnl = currentPrice.mul(position.currentShares).minus(position.costBasis);
    const totalPnl = position.realizedPnl.plus(unrealizedPnl);
    const averageEntryPrice = position.currentShares.gt(0)
      ? position.costBasis.div(position.currentShares)
      : new Decimal(0);
    const averageExitPrice = position.exitCount.gt(0)
      ? position.averageExitPriceTotal.div(position.exitCount)
      : new Decimal(0);

    return {
      marketId: position.marketId,
      conditionId: position.conditionId,
      outcome: position.outcome,
      currentShares: money(position.currentShares),
      averageEntryPrice: money(averageEntryPrice),
      averageExitPrice: money(averageExitPrice),
      realizedPnl: money(position.realizedPnl),
      unrealizedPnl: money(unrealizedPnl),
      totalPnl: money(totalPnl),
      confidenceScore: position.confidenceScore
    };
  });
}

export function calculateWalletMetrics(
  trades: AnalyticsTrade[],
  positions: ReconstructedPosition[]
): WalletMetricResult {
  const totalPnl = positions.reduce(
    (sum, position) => sum.plus(position.totalPnl),
    new Decimal(0)
  );
  const volume = trades.reduce(
    (sum, trade) => sum.plus(decimal(trade.price).mul(decimal(trade.size).abs())),
    new Decimal(0)
  );
  const winningPositions = positions.filter((position) => decimal(position.totalPnl).gt(0)).length;
  const winrate =
    positions.length === 0 ? new Decimal(0) : new Decimal(winningPositions).div(positions.length);

  return {
    totalPnl: money(totalPnl),
    winrate: money(winrate),
    volume: money(volume),
    drawdown: calculateMaxDrawdown(buildPnlChart(trades, positions)),
    tradeCount: trades.length
  };
}

export function buildPnlChart(
  trades: AnalyticsTrade[],
  positions: ReconstructedPosition[] = []
): PnlPoint[] {
  const daily = new Map<string, Decimal>();
  const openPositions = new Map<string, { shares: Decimal; costBasis: Decimal }>();
  let realizedCumulative = new Decimal(0);

  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const trade of sortedTrades) {
    const date = new Date(trade.timestamp).toISOString().slice(0, 10);
    const key = positionKey(trade);
    const current = openPositions.get(key) ?? {
      shares: new Decimal(0),
      costBasis: new Decimal(0)
    };
    const price = decimal(trade.price);
    const size = decimal(trade.size).abs();

    if (normalizedSide(trade) === "buy") {
      current.shares = current.shares.plus(size);
      current.costBasis = current.costBasis.plus(price.mul(size));
      openPositions.set(key, current);
      daily.set(date, daily.get(date) ?? new Decimal(0));
      continue;
    }

    const sharesToClose = Decimal.min(size, current.shares);
    const averageEntry = current.shares.gt(0) ? current.costBasis.div(current.shares) : new Decimal(0);
    const realizedPnl = price.minus(averageEntry).mul(sharesToClose);
    current.shares = current.shares.minus(sharesToClose);
    current.costBasis = current.costBasis.minus(averageEntry.mul(sharesToClose));
    realizedCumulative = realizedCumulative.plus(realizedPnl);
    openPositions.set(key, current);
    daily.set(date, (daily.get(date) ?? new Decimal(0)).plus(realizedPnl));
  }

  if (daily.size === 0 && positions.length > 0) {
    daily.set(new Date().toISOString().slice(0, 10), new Decimal(0));
  }

  if (positions.length > 0) {
    const totalPnl = positions.reduce((sum, position) => sum.plus(position.totalPnl), new Decimal(0));
    const adjustment = totalPnl.minus(realizedCumulative);
    if (!adjustment.isZero()) {
      const lastDate =
        sortedTrades.length > 0
          ? new Date(sortedTrades[sortedTrades.length - 1]!.timestamp).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);
      daily.set(lastDate, (daily.get(lastDate) ?? new Decimal(0)).plus(adjustment));
    }
  }

  let cumulative = new Decimal(0);
  return [...daily.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dailyPnl]) => {
      cumulative = cumulative.plus(dailyPnl);
      return {
        date,
        dailyPnl: money(dailyPnl),
        cumulativePnl: money(cumulative)
      };
    });
}

export function calculateMaxDrawdown(points: PnlPoint[]): string {
  let peak = new Decimal(0);
  let maxDrawdown = new Decimal(0);

  for (const point of points) {
    const equity = decimal(point.cumulativePnl);
    peak = Decimal.max(peak, equity);
    const drawdown = peak.minus(equity);
    maxDrawdown = Decimal.max(maxDrawdown, drawdown);
  }

  return money(maxDrawdown);
}

export function buildDrawdownChart(points: PnlPoint[]): DrawdownPoint[] {
  let peak = new Decimal(0);

  return points.map((point) => {
    const equity = decimal(point.cumulativePnl);
    peak = Decimal.max(peak, equity);
    return {
      date: point.date,
      cumulativePnl: money(equity),
      drawdown: money(peak.minus(equity))
    };
  });
}

export function buildTradeHistoryAnalytics(trades: AnalyticsTrade[]): TradeHistoryAnalytics[] {
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const openPositions = new Map<string, { shares: Decimal; costBasis: Decimal }>();

  return sortedTrades.map((trade) => {
    const key = positionKey(trade);
    const current = openPositions.get(key) ?? {
      shares: new Decimal(0),
      costBasis: new Decimal(0)
    };
    const side = normalizedSide(trade);
    const price = decimal(trade.price);
    const size = decimal(trade.size).abs();

    if (side === "buy") {
      const positionEffect: TradePositionEffect = current.shares.gt(0) ? "add" : "entry";
      const next = {
        shares: current.shares.plus(size),
        costBasis: current.costBasis.plus(price.mul(size))
      };
      openPositions.set(key, next);

      return {
        tradeId: trade.id,
        side,
        positionEffect,
        realizedPnl: "0",
        result: "open",
        remainingShares: money(next.shares)
      };
    }

    const sharesToClose = Decimal.min(size, current.shares);
    const averageEntry = current.shares.gt(0) ? current.costBasis.div(current.shares) : new Decimal(0);
    const realizedPnl = price.minus(averageEntry).mul(sharesToClose);
    const next = {
      shares: current.shares.minus(sharesToClose),
      costBasis: current.costBasis.minus(averageEntry.mul(sharesToClose))
    };
    openPositions.set(key, next);

    return {
      tradeId: trade.id,
      side,
      positionEffect: next.shares.isZero() ? "close" : "reduce",
      realizedPnl: money(realizedPnl),
      result: tradeResult(realizedPnl),
      remainingShares: money(next.shares)
    };
  });
}

function tradeResult(realizedPnl: Decimal): TradeResult {
  if (realizedPnl.gt(0)) {
    return "win";
  }
  if (realizedPnl.lt(0)) {
    return "loss";
  }
  return "flat";
}

export function calculateAdvancedPerformance(
  trades: AnalyticsTrade[],
  positions: ReconstructedPosition[],
  marketResolutions: MarketResolution[] = []
): AdvancedPerformanceResult {
  const closedTrades = buildClosedTradeResults(trades);
  const pnlPoints = buildPnlChart(trades, positions);
  const drawdowns = calculateDrawdowns(pnlPoints);
  const streaks = calculateStreaks(closedTrades);

  const realizedPnl = positions.reduce(
    (sum, position) => sum.plus(position.realizedPnl),
    new Decimal(0)
  );
  const unrealizedPnl = positions.reduce(
    (sum, position) => sum.plus(position.unrealizedPnl),
    new Decimal(0)
  );
  const totalPnl = realizedPnl.plus(unrealizedPnl);
  const investedCapital = trades.reduce((sum, trade) => {
    if (normalizedSide(trade) !== "buy") {
      return sum;
    }
    return sum.plus(decimal(trade.price).mul(decimal(trade.size).abs()));
  }, new Decimal(0));

  const winningClosedTrades = closedTrades.filter((result) => result.pnl.gt(0)).length;
  const winningMarkets = positions.filter((position) => decimal(position.totalPnl).gt(0)).length;
  const resolvedMarketIds = new Set(
    marketResolutions
      .filter((market) => market.resolved)
      .map((market) => market.marketId)
  );
  const resolvedPositions = positions.filter((position) => resolvedMarketIds.has(position.marketId));
  const winningResolvedMarkets = resolvedPositions.filter((position) => decimal(position.totalPnl).gt(0)).length;
  const bestTrade = selectTradeHighlight(closedTrades, "best");
  const worstTrade = selectTradeHighlight(closedTrades, "worst");

  return {
    realizedPnl: money(realizedPnl),
    unrealizedPnl: money(unrealizedPnl),
    totalPnl: money(totalPnl),
    roi: investedCapital.isZero() ? "0" : money(totalPnl.div(investedCapital)),
    tradeWinrate: closedTrades.length === 0 ? "0" : money(new Decimal(winningClosedTrades).div(closedTrades.length)),
    marketWinrate: positions.length === 0 ? "0" : money(new Decimal(winningMarkets).div(positions.length)),
    resolvedMarketWinrate:
      resolvedPositions.length === 0 ? "0" : money(new Decimal(winningResolvedMarkets).div(resolvedPositions.length)),
    maxDrawdown: money(drawdowns.maxDrawdown),
    currentDrawdown: money(drawdowns.currentDrawdown),
    averageDrawdown: money(drawdowns.averageDrawdown),
    longestWinStreak: streaks.longestWinStreak,
    longestLossStreak: streaks.longestLossStreak,
    bestTrade,
    worstTrade,
    profitDistribution: buildProfitDistribution(positions),
    winLossChart: buildWinLossChart(closedTrades)
  };
}

function buildClosedTradeResults(trades: AnalyticsTrade[]): ClosedTradeResult[] {
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const openPositions = new Map<string, { shares: Decimal; costBasis: Decimal }>();
  const results: ClosedTradeResult[] = [];

  for (const trade of sortedTrades) {
    const key = positionKey(trade);
    const current = openPositions.get(key) ?? {
      shares: new Decimal(0),
      costBasis: new Decimal(0)
    };
    const price = decimal(trade.price);
    const size = decimal(trade.size).abs();

    if (normalizedSide(trade) === "buy") {
      openPositions.set(key, {
        shares: current.shares.plus(size),
        costBasis: current.costBasis.plus(price.mul(size))
      });
      continue;
    }

    const sharesToClose = Decimal.min(size, current.shares);
    const averageEntry = current.shares.gt(0) ? current.costBasis.div(current.shares) : new Decimal(0);
    const pnl = price.minus(averageEntry).mul(sharesToClose);
    openPositions.set(key, {
      shares: current.shares.minus(sharesToClose),
      costBasis: current.costBasis.minus(averageEntry.mul(sharesToClose))
    });
    results.push({ trade, pnl });
  }

  return results;
}

function calculateDrawdowns(points: PnlPoint[]): {
  maxDrawdown: Decimal;
  currentDrawdown: Decimal;
  averageDrawdown: Decimal;
} {
  let peak = new Decimal(0);
  let maxDrawdown = new Decimal(0);
  let currentDrawdown = new Decimal(0);
  let drawdownTotal = new Decimal(0);
  let drawdownCount = 0;

  for (const point of points) {
    const equity = decimal(point.cumulativePnl);
    peak = Decimal.max(peak, equity);
    const drawdown = peak.minus(equity);
    maxDrawdown = Decimal.max(maxDrawdown, drawdown);
    currentDrawdown = drawdown;
    if (drawdown.gt(0)) {
      drawdownTotal = drawdownTotal.plus(drawdown);
      drawdownCount += 1;
    }
  }

  return {
    maxDrawdown,
    currentDrawdown,
    averageDrawdown: drawdownCount === 0 ? new Decimal(0) : drawdownTotal.div(drawdownCount)
  };
}

function calculateStreaks(results: ClosedTradeResult[]): {
  longestWinStreak: number;
  longestLossStreak: number;
} {
  let currentType: "win" | "loss" | null = null;
  let currentCount = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;

  for (const result of results) {
    if (result.pnl.isZero()) {
      currentType = null;
      currentCount = 0;
      continue;
    }

    const nextType = result.pnl.gt(0) ? "win" : "loss";
    currentCount = currentType === nextType ? currentCount + 1 : 1;
    currentType = nextType;

    if (nextType === "win") {
      longestWinStreak = Math.max(longestWinStreak, currentCount);
    } else {
      longestLossStreak = Math.max(longestLossStreak, currentCount);
    }
  }

  return { longestWinStreak, longestLossStreak };
}

function selectTradeHighlight(results: ClosedTradeResult[], mode: "best" | "worst"): TradeHighlight | null {
  const selected = results.reduce<ClosedTradeResult | null>((current, result) => {
    if (!current) {
      return result;
    }
    return mode === "best"
      ? result.pnl.gt(current.pnl)
        ? result
        : current
      : result.pnl.lt(current.pnl)
        ? result
        : current;
  }, null);

  if (!selected) {
    return null;
  }

  return {
    tradeId: selected.trade.id,
    marketId: selected.trade.marketId,
    conditionId: selected.trade.conditionId,
    outcome: selected.trade.outcome,
    timestamp: selected.trade.timestamp,
    pnl: money(selected.pnl),
    price: money(decimal(selected.trade.price)),
    size: money(decimal(selected.trade.size).abs())
  };
}

function buildProfitDistribution(positions: ReconstructedPosition[]): ProfitDistributionBucket[] {
  const buckets = [
    { bucket: "< -$100", count: 0, matches: (value: Decimal) => value.lt(-100) },
    { bucket: "-$100 to -$10", count: 0, matches: (value: Decimal) => value.gte(-100) && value.lt(-10) },
    { bucket: "-$10 to $0", count: 0, matches: (value: Decimal) => value.gte(-10) && value.lt(0) },
    { bucket: "$0 to $10", count: 0, matches: (value: Decimal) => value.gte(0) && value.lt(10) },
    { bucket: "$10 to $100", count: 0, matches: (value: Decimal) => value.gte(10) && value.lte(100) },
    { bucket: "> $100", count: 0, matches: (value: Decimal) => value.gt(100) }
  ];

  const countedBuckets = positions.reduce(
    (currentBuckets, position) =>
      currentBuckets.map((bucket) =>
        bucket.matches(decimal(position.totalPnl))
          ? { ...bucket, count: bucket.count + 1 }
          : bucket
      ),
    buckets
  );

  return countedBuckets.map(({ bucket, count }) => ({ bucket, count }));
}

function buildWinLossChart(results: ClosedTradeResult[]): WinLossPoint[] {
  const byDate = new Map<string, WinLossPoint>();

  for (const result of results) {
    if (result.pnl.isZero()) {
      continue;
    }

    const date = new Date(result.trade.timestamp).toISOString().slice(0, 10);
    const existing = byDate.get(date) ?? { date, wins: 0, losses: 0 };
    byDate.set(date, {
      date,
      wins: existing.wins + (result.pnl.gt(0) ? 1 : 0),
      losses: existing.losses + (result.pnl.lt(0) ? 1 : 0)
    });
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
