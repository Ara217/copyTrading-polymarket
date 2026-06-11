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

export interface AnalyticsMarket {
  marketId: string;
  category?: string | null;
}

export interface CopyReadinessConfig {
  copyBalance: string;
  maxPositionSize: string;
  minPositionSize: string;
  oversizedThreshold: string;
  topPercent: number;
  relativeMultiplier: string;
}

export type ReadinessWarningSeverity = "info" | "warning" | "critical";

export interface ReadinessWarning {
  code: string;
  severity: ReadinessWarningSeverity;
  message: string;
}

export interface ActivityCadence {
  activeDays: number;
  observedDays: number;
  tradesPerActiveDay: string;
  daysSinceLastTrade: number | null;
}

export interface CategoryExposure {
  category: string;
  tradeCount: number;
  marketCount: number;
  positionCount: number;
  volume: string;
  volumeShare: string;
}

export type OversizedTradeMethod = "threshold" | "topPercent" | "relative";

export interface OversizedTrade {
  tradeId: string;
  marketId: string;
  conditionId: string;
  outcome: string;
  timestamp: string;
  side: TradeSide;
  price: string;
  size: string;
  value: string;
  methods: OversizedTradeMethod[];
  result: TradeResult;
  realizedPnl: string;
}

export interface OversizedTradeSummary {
  count: number;
  roi: string;
  winrate: string;
  largestWin: string;
  largestLoss: string;
}

export interface CopyReadinessInput {
  trades: AnalyticsTrade[];
  positions: ReconstructedPosition[];
  markets?: AnalyticsMarket[];
  now?: string;
  config?: Partial<CopyReadinessConfig>;
}

export interface CopyReadinessResult {
  readinessScore: number;
  dataCoverageScore: number;
  freshnessScore: number;
  activityScore: number;
  liquidityScore: number;
  positionSizeScore: number;
  activityCadence: ActivityCadence;
  categoryExposure: CategoryExposure[];
  oversizedTrades: OversizedTrade[];
  oversizedTradeSummary: OversizedTradeSummary;
  warnings: ReadinessWarning[];
  config: CopyReadinessConfig;
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

function score(value: Decimal): number {
  return Math.max(0, Math.min(100, Math.round(value.toNumber())));
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

const defaultCopyReadinessConfig: CopyReadinessConfig = {
  copyBalance: "1000",
  maxPositionSize: "100",
  minPositionSize: "5",
  oversizedThreshold: "250",
  topPercent: 0.05,
  relativeMultiplier: "3"
};

export function calculateCopyReadiness(input: CopyReadinessInput): CopyReadinessResult {
  const config = normalizeCopyReadinessConfig(input.config);
  const trades = [...input.trades].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const markets = input.markets ?? [];
  const now = input.now ? new Date(input.now) : new Date();
  const categoryExposure = buildCategoryExposure(trades, input.positions, markets);
  const oversizedTrades = classifyOversizedTrades(trades, config);
  const oversizedTradeSummary = summarizeOversizedTrades(oversizedTrades);
  const activityCadence = calculateActivityCadence(trades, now);
  const marketCount = new Set(trades.map((trade) => trade.conditionId || trade.marketId)).size;

  const dataCoverageScore = score(
    Decimal.min(60, new Decimal(trades.length).div(100).mul(60)).plus(
      Decimal.min(40, new Decimal(marketCount).div(20).mul(40))
    )
  );
  const freshnessScore = calculateFreshnessScore(activityCadence.daysSinceLastTrade);
  const activityScore = calculateActivityScore(activityCadence);
  const liquidityScore = calculateLiquidityScore(trades, config);
  const positionSizeScore = calculatePositionSizeScore(input.positions, config);
  const readinessScore = score(
    new Decimal(dataCoverageScore)
      .mul("0.25")
      .plus(new Decimal(freshnessScore).mul("0.20"))
      .plus(new Decimal(activityScore).mul("0.20"))
      .plus(new Decimal(liquidityScore).mul("0.20"))
      .plus(new Decimal(positionSizeScore).mul("0.15"))
  );

  return {
    readinessScore,
    dataCoverageScore,
    freshnessScore,
    activityScore,
    liquidityScore,
    positionSizeScore,
    activityCadence,
    categoryExposure,
    oversizedTrades,
    oversizedTradeSummary,
    warnings: buildReadinessWarnings({
      tradeCount: trades.length,
      dataCoverageScore,
      freshnessScore,
      activityScore,
      liquidityScore,
      positionSizeScore,
      oversizedTrades,
      oversizedTradeSummary
    }),
    config
  };
}

export function classifyOversizedTrades(
  trades: AnalyticsTrade[],
  configInput: Partial<CopyReadinessConfig> = {}
): OversizedTrade[] {
  if (trades.length === 0) {
    return [];
  }

  const config = normalizeCopyReadinessConfig(configInput);
  const tradeValues = trades.map((trade) => tradeValue(trade));
  const averageValue = tradeValues.reduce((sum, value) => sum.plus(value), new Decimal(0)).div(trades.length);
  const sortedValues = [...tradeValues].sort((a, b) => b.cmp(a));
  const percentileIndex = Math.max(0, Math.ceil(trades.length * config.topPercent) - 1);
  const percentileCutoff = sortedValues[percentileIndex] ?? new Decimal(0);
  const threshold = decimal(config.oversizedThreshold);
  const relativeCutoff = averageValue.mul(config.relativeMultiplier);
  const historyById = new Map(buildTradeHistoryAnalytics(trades).map((trade) => [trade.tradeId, trade]));

  return trades
    .map((trade) => {
      const value = tradeValue(trade);
      const methods: OversizedTradeMethod[] = [];
      if (value.gte(threshold)) {
        methods.push("threshold");
      }
      if (value.gte(percentileCutoff) && config.topPercent > 0) {
        methods.push("topPercent");
      }
      if (value.gte(relativeCutoff) && relativeCutoff.gt(0)) {
        methods.push("relative");
      }
      const history = historyById.get(trade.id);

      return {
        trade,
        value,
        methods,
        history
      };
    })
    .filter((trade) => trade.methods.length > 0)
    .sort((a, b) => b.value.cmp(a.value))
    .map(({ trade, value, methods, history }) => ({
      tradeId: trade.id,
      marketId: trade.marketId,
      conditionId: trade.conditionId,
      outcome: trade.outcome,
      timestamp: trade.timestamp,
      side: normalizedSide(trade),
      price: money(decimal(trade.price)),
      size: money(decimal(trade.size).abs()),
      value: money(value),
      methods,
      result: history?.result ?? "open",
      realizedPnl: history?.realizedPnl ?? "0"
    }));
}

function normalizeCopyReadinessConfig(config: Partial<CopyReadinessConfig> = {}): CopyReadinessConfig {
  return {
    copyBalance: config.copyBalance ?? defaultCopyReadinessConfig.copyBalance,
    maxPositionSize: config.maxPositionSize ?? defaultCopyReadinessConfig.maxPositionSize,
    minPositionSize: config.minPositionSize ?? defaultCopyReadinessConfig.minPositionSize,
    oversizedThreshold: config.oversizedThreshold ?? defaultCopyReadinessConfig.oversizedThreshold,
    topPercent: config.topPercent ?? defaultCopyReadinessConfig.topPercent,
    relativeMultiplier: config.relativeMultiplier ?? defaultCopyReadinessConfig.relativeMultiplier
  };
}

function tradeValue(trade: AnalyticsTrade): Decimal {
  return decimal(trade.price).mul(decimal(trade.size).abs());
}

function buildCategoryExposure(
  trades: AnalyticsTrade[],
  positions: ReconstructedPosition[],
  markets: AnalyticsMarket[]
): CategoryExposure[] {
  const categoryByMarketId = new Map(markets.map((market) => [market.marketId, market.category || "Unknown"]));
  const buckets = new Map<
    string,
    { volume: Decimal; tradeCount: number; marketIds: Set<string>; positionKeys: Set<string> }
  >();
  const totalVolume = trades.reduce((sum, trade) => sum.plus(tradeValue(trade)), new Decimal(0));

  for (const trade of trades) {
    const marketId = trade.conditionId || trade.marketId;
    const category = categoryByMarketId.get(marketId) ?? categoryByMarketId.get(trade.marketId) ?? "Unknown";
    const bucket = buckets.get(category) ?? {
      volume: new Decimal(0),
      tradeCount: 0,
      marketIds: new Set<string>(),
      positionKeys: new Set<string>()
    };
    bucket.volume = bucket.volume.plus(tradeValue(trade));
    bucket.tradeCount += 1;
    bucket.marketIds.add(marketId);
    buckets.set(category, bucket);
  }

  for (const position of positions) {
    const category = categoryByMarketId.get(position.marketId) ?? "Unknown";
    const bucket = buckets.get(category) ?? {
      volume: new Decimal(0),
      tradeCount: 0,
      marketIds: new Set<string>(),
      positionKeys: new Set<string>()
    };
    bucket.positionKeys.add(positionKey(position));
    buckets.set(category, bucket);
  }

  return [...buckets.entries()]
    .map(([category, bucket]) => ({
      category,
      tradeCount: bucket.tradeCount,
      marketCount: bucket.marketIds.size,
      positionCount: bucket.positionKeys.size,
      volume: money(bucket.volume),
      volumeShare: totalVolume.isZero() ? "0" : money(bucket.volume.div(totalVolume))
    }))
    .sort((a, b) => decimal(b.volume).cmp(a.volume));
}

function summarizeOversizedTrades(trades: OversizedTrade[]): OversizedTradeSummary {
  const closed = trades.filter((trade) => trade.result !== "open");
  const totalPnl = closed.reduce((sum, trade) => sum.plus(trade.realizedPnl), new Decimal(0));
  const totalValue = trades.reduce((sum, trade) => sum.plus(trade.value), new Decimal(0));
  const wins = closed.filter((trade) => decimal(trade.realizedPnl).gt(0)).length;
  const largestWin = closed.reduce(
    (current, trade) => Decimal.max(current, decimal(trade.realizedPnl)),
    new Decimal(0)
  );
  const largestLoss = closed.reduce(
    (current, trade) => Decimal.min(current, decimal(trade.realizedPnl)),
    new Decimal(0)
  );

  return {
    count: trades.length,
    roi: totalValue.isZero() ? "0" : money(totalPnl.div(totalValue)),
    winrate: closed.length === 0 ? "0" : money(new Decimal(wins).div(closed.length)),
    largestWin: money(largestWin),
    largestLoss: money(largestLoss)
  };
}

function calculateActivityCadence(trades: AnalyticsTrade[], now: Date): ActivityCadence {
  if (trades.length === 0) {
    return {
      activeDays: 0,
      observedDays: 0,
      tradesPerActiveDay: "0",
      daysSinceLastTrade: null
    };
  }

  const dates = trades.map((trade) => new Date(trade.timestamp));
  const activeDays = new Set(dates.map((date) => date.toISOString().slice(0, 10))).size;
  const first = dates[0]!;
  const last = dates[dates.length - 1]!;
  const observedDays = Math.max(1, Math.ceil((last.getTime() - first.getTime()) / 86_400_000) + 1);
  const daysSinceLastTrade = Math.max(0, Math.floor((now.getTime() - last.getTime()) / 86_400_000));

  return {
    activeDays,
    observedDays,
    tradesPerActiveDay: money(new Decimal(trades.length).div(activeDays)),
    daysSinceLastTrade
  };
}

function calculateFreshnessScore(daysSinceLastTrade: number | null): number {
  if (daysSinceLastTrade === null) {
    return 0;
  }
  if (daysSinceLastTrade <= 1) {
    return 100;
  }
  if (daysSinceLastTrade <= 7) {
    return 85;
  }
  if (daysSinceLastTrade <= 30) {
    return 65;
  }
  if (daysSinceLastTrade <= 90) {
    return 35;
  }
  return 10;
}

function calculateActivityScore(cadence: ActivityCadence): number {
  if (cadence.activeDays === 0 || cadence.observedDays === 0) {
    return 0;
  }
  const density = new Decimal(cadence.activeDays).div(cadence.observedDays);
  const activeDayScore = Decimal.min(60, new Decimal(cadence.activeDays).div(20).mul(60));
  return score(activeDayScore.plus(Decimal.min(40, density.mul(100))));
}

function calculateLiquidityScore(trades: AnalyticsTrade[], config: CopyReadinessConfig): number {
  if (trades.length === 0) {
    return 0;
  }
  const maxPositionSize = decimal(config.maxPositionSize);
  const compatibleTrades = trades.filter((trade) => tradeValue(trade).lte(maxPositionSize)).length;
  return score(new Decimal(compatibleTrades).div(trades.length).mul(100));
}

function calculatePositionSizeScore(
  positions: ReconstructedPosition[],
  config: CopyReadinessConfig
): number {
  if (positions.length === 0) {
    return 50;
  }
  const maxPositionSize = decimal(config.maxPositionSize);
  const minPositionSize = decimal(config.minPositionSize);
  const compatiblePositions = positions.filter((position) => {
    const exposure = decimal(position.currentShares).abs().mul(position.averageEntryPrice);
    return exposure.isZero() || (exposure.gte(minPositionSize) && exposure.lte(maxPositionSize));
  }).length;

  return score(new Decimal(compatiblePositions).div(positions.length).mul(100));
}

function buildReadinessWarnings(input: {
  tradeCount: number;
  dataCoverageScore: number;
  freshnessScore: number;
  activityScore: number;
  liquidityScore: number;
  positionSizeScore: number;
  oversizedTrades: OversizedTrade[];
  oversizedTradeSummary: OversizedTradeSummary;
}): ReadinessWarning[] {
  const warnings: ReadinessWarning[] = [];

  if (input.tradeCount < 50) {
    warnings.push({
      code: "LOW_DATA_COVERAGE",
      severity: "warning",
      message: "Limited public trade sample; use this wallet as a watch candidate until more history is available."
    });
  }
  if (input.freshnessScore < 65) {
    warnings.push({
      code: "STALE_ACTIVITY",
      severity: "warning",
      message: "The wallet has not traded recently enough for fresh copy-trading evidence."
    });
  }
  if (input.activityScore < 40) {
    warnings.push({
      code: "SPARSE_ACTIVITY",
      severity: "info",
      message: "Trading cadence is sparse, so signals may arrive irregularly."
    });
  }
  if (input.liquidityScore < 70 || input.positionSizeScore < 70) {
    warnings.push({
      code: "POSITION_SIZE_MISMATCH",
      severity: "warning",
      message: "Observed trade sizes may be hard to mirror with the selected copy constraints."
    });
  }
  if (input.oversizedTrades.length > 0) {
    warnings.push({
      code: "OVERSIZED_TRADES",
      severity: "warning",
      message: "Some trades exceed the configured copy size rules and should be capped or skipped in simulation."
    });
  }
  if (decimal(input.oversizedTradeSummary.roi).lt(0)) {
    warnings.push({
      code: "NEGATIVE_OVERSIZED_ROI",
      severity: "critical",
      message: "Oversized closed trades have negative realized ROI in the available history."
    });
  }

  return warnings;
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
