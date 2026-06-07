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
