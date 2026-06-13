import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  buildDrawdownChart,
  buildPnlChart,
  buildTradeHistoryAnalytics,
  calculateAdvancedPerformance,
  calculateCopyReadiness,
  calculateWalletMetrics,
  reconstructPositions,
  buildCopySizingSuggestion,
  simulateCopyTrading,
  simulateDelaySensitivity,
  type AnalyticsTrade,
  type CopyPriceHistorySeries,
  type CopyReadinessConfig,
  type CopySimulationInput,
  type MarketPrice
} from "@polyand/analytics";
import {
  type CategoryExposure,
  type CopyReadiness,
  type CopyReadinessDataValidation,
  type CopyReadinessInterpretation,
  type CopySimulationListItem,
  type CopySimulationRecord,
  type CopySimulationResult,
  type CopySimulationSettings,
  type CopySimulationSummary,
  type CopySizingSuggestion,
  type DrawdownChartPoint,
  type OversizedTrade,
  type PnlChartPoint,
  type PositionRow,
  type ProfitDistributionBucket,
  type TradeHighlight,
  type TradeRow,
  type WalletOverview,
  type WalletPerformance,
  type WinLossChartPoint
} from "@polyand/types";
import { CacheService } from "../cache/cache.service";
import { PolymarketService } from "../polymarket/polymarket.service";
import { NormalizedMarket, NormalizedTrade } from "../polymarket/types";
import { PrismaService } from "../prisma/prisma.service";
import {
  parseWalletAddress,
  polymarketProfileSlugSchema,
  walletAddressFromProfileSlug,
  type ParsedCopySimulationSettings
} from "@polyand/shared";
import { inferMarketCategory } from "./market-category";

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly polymarket: PolymarketService,
    private readonly cache: CacheService
  ) {}

  async resolveWalletIdentifier(identifier: string): Promise<string> {
    try {
      return parseWalletAddress(identifier);
    } catch {
      const profileSlug = polymarketProfileSlugSchema.parse(identifier);
      return walletAddressFromProfileSlug(profileSlug);
    }
  }

  async recordSyncJob(id: string, walletAddress: string, status: string): Promise<void> {
    await this.prisma.syncJob.upsert({
      where: { id },
      create: { id, walletAddress, status },
      update: { status }
    });
  }

  async refreshWallet(walletAddress: string): Promise<void> {
    await this.recordSyncJob(`wallet:${walletAddress}:latest`, walletAddress, "active");
    const trades = this.dedupeTradesForPersistence(await this.polymarket.getWalletTrades(walletAddress));
    const markets = this.enrichMarketsFromTrades(
      await this.polymarket.getMarkets(trades.map((trade) => trade.conditionId)),
      trades
    );
    const priceSnapshots = await this.polymarket.getPriceSnapshots(markets, trades);
    const analyticsTrades = this.toAnalyticsTrades(trades);
    const positions = reconstructPositions(analyticsTrades, priceSnapshots);
    const metrics = calculateWalletMetrics(analyticsTrades, positions);
    const performance = calculateAdvancedPerformance(
      analyticsTrades,
      positions,
      markets.map((market) => ({ marketId: market.conditionId, resolved: market.resolved }))
    );
    const readiness = calculateCopyReadiness({
      trades: analyticsTrades,
      positions,
      markets: markets.map((market) => ({
        marketId: market.conditionId,
        category: market.category
      }))
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.upsert({
        where: { address: walletAddress },
        create: {
          address: walletAddress,
          lastSyncedAt: new Date(),
          rawJson: { walletAddress },
          source: "data",
          fetchedAt: new Date(),
          adapterVersion: "polymarket-v1"
        },
        update: {
          lastSyncedAt: new Date(),
          rawJson: { walletAddress },
          source: "data",
          fetchedAt: new Date(),
          adapterVersion: "polymarket-v1"
        }
      });

      for (const market of markets) {
        await this.upsertMarket(tx, market);
      }

      await tx.trade.deleteMany({ where: { walletAddress } });
      await tx.position.deleteMany({ where: { walletAddress } });

      if (trades.length > 0) {
        await tx.trade.createMany({
          data: trades.map((trade) => ({
            walletAddress,
            marketId: trade.marketId,
            conditionId: trade.conditionId,
            outcome: trade.outcome,
            price: new Prisma.Decimal(trade.price),
            size: new Prisma.Decimal(trade.size),
            value: new Prisma.Decimal(trade.value),
            side: trade.side,
            timestamp: new Date(trade.timestamp),
            transactionHash: trade.transactionHash,
            rawJson: trade.rawJson as Prisma.InputJsonValue,
            source: trade.metadata.source,
            fetchedAt: new Date(trade.metadata.fetchedAt),
            adapterVersion: trade.metadata.adapterVersion
          })),
          skipDuplicates: true
        });
      }

      if (positions.length > 0) {
        await tx.position.createMany({
          data: positions.map((position) => ({
            walletAddress,
            marketId: position.marketId,
            outcome: position.outcome,
            currentShares: new Prisma.Decimal(position.currentShares),
            averageEntryPrice: new Prisma.Decimal(position.averageEntryPrice),
            averageExitPrice: new Prisma.Decimal(position.averageExitPrice),
            realizedPnl: new Prisma.Decimal(position.realizedPnl),
            unrealizedPnl: new Prisma.Decimal(position.unrealizedPnl),
            totalPnl: new Prisma.Decimal(position.totalPnl),
            confidenceScore: position.confidenceScore
          }))
        });
      }

      await tx.walletMetrics.upsert({
        where: { walletAddress },
        create: {
          walletAddress,
          totalPnl: new Prisma.Decimal(metrics.totalPnl),
          winrate: new Prisma.Decimal(metrics.winrate),
          volume: new Prisma.Decimal(metrics.volume),
          drawdown: new Prisma.Decimal(metrics.drawdown),
          tradeCount: metrics.tradeCount,
          realizedPnl: new Prisma.Decimal(performance.realizedPnl),
          unrealizedPnl: new Prisma.Decimal(performance.unrealizedPnl),
          roi: new Prisma.Decimal(performance.roi),
          tradeWinrate: new Prisma.Decimal(performance.tradeWinrate),
          marketWinrate: new Prisma.Decimal(performance.marketWinrate),
          resolvedMarketWinrate: new Prisma.Decimal(performance.resolvedMarketWinrate),
          maxDrawdown: new Prisma.Decimal(performance.maxDrawdown),
          currentDrawdown: new Prisma.Decimal(performance.currentDrawdown),
          averageDrawdown: new Prisma.Decimal(performance.averageDrawdown),
          longestWinStreak: performance.longestWinStreak,
          longestLossStreak: performance.longestLossStreak,
          bestTradeJson: this.jsonOrNull(performance.bestTrade),
          worstTradeJson: this.jsonOrNull(performance.worstTrade),
          profitDistributionJson: performance.profitDistribution as unknown as Prisma.InputJsonValue,
          winLossChartJson: performance.winLossChart as unknown as Prisma.InputJsonValue
        },
        update: {
          totalPnl: new Prisma.Decimal(metrics.totalPnl),
          winrate: new Prisma.Decimal(metrics.winrate),
          volume: new Prisma.Decimal(metrics.volume),
          drawdown: new Prisma.Decimal(metrics.drawdown),
          tradeCount: metrics.tradeCount,
          realizedPnl: new Prisma.Decimal(performance.realizedPnl),
          unrealizedPnl: new Prisma.Decimal(performance.unrealizedPnl),
          roi: new Prisma.Decimal(performance.roi),
          tradeWinrate: new Prisma.Decimal(performance.tradeWinrate),
          marketWinrate: new Prisma.Decimal(performance.marketWinrate),
          resolvedMarketWinrate: new Prisma.Decimal(performance.resolvedMarketWinrate),
          maxDrawdown: new Prisma.Decimal(performance.maxDrawdown),
          currentDrawdown: new Prisma.Decimal(performance.currentDrawdown),
          averageDrawdown: new Prisma.Decimal(performance.averageDrawdown),
          longestWinStreak: performance.longestWinStreak,
          longestLossStreak: performance.longestLossStreak,
          bestTradeJson: this.jsonOrNull(performance.bestTrade),
          worstTradeJson: this.jsonOrNull(performance.worstTrade),
          profitDistributionJson: performance.profitDistribution as unknown as Prisma.InputJsonValue,
          winLossChartJson: performance.winLossChart as unknown as Prisma.InputJsonValue
        }
      });

      await tx.walletReadiness.upsert({
        where: { walletAddress },
        create: {
          walletAddress,
          readinessScore: readiness.readinessScore,
          dataCoverageScore: readiness.dataCoverageScore,
          freshnessScore: readiness.freshnessScore,
          activityScore: readiness.activityScore,
          liquidityScore: readiness.liquidityScore,
          positionSizeScore: readiness.positionSizeScore,
          activityCadenceJson: readiness.activityCadence as unknown as Prisma.InputJsonValue,
          categoryExposureJson: readiness.categoryExposure as unknown as Prisma.InputJsonValue,
          oversizedTradesJson: readiness.oversizedTrades as unknown as Prisma.InputJsonValue,
          oversizedTradeSummaryJson: readiness.oversizedTradeSummary as unknown as Prisma.InputJsonValue,
          warningsJson: readiness.warnings as unknown as Prisma.InputJsonValue,
          configJson: readiness.config as unknown as Prisma.InputJsonValue
        },
        update: {
          readinessScore: readiness.readinessScore,
          dataCoverageScore: readiness.dataCoverageScore,
          freshnessScore: readiness.freshnessScore,
          activityScore: readiness.activityScore,
          liquidityScore: readiness.liquidityScore,
          positionSizeScore: readiness.positionSizeScore,
          activityCadenceJson: readiness.activityCadence as unknown as Prisma.InputJsonValue,
          categoryExposureJson: readiness.categoryExposure as unknown as Prisma.InputJsonValue,
          oversizedTradesJson: readiness.oversizedTrades as unknown as Prisma.InputJsonValue,
          oversizedTradeSummaryJson: readiness.oversizedTradeSummary as unknown as Prisma.InputJsonValue,
          warningsJson: readiness.warnings as unknown as Prisma.InputJsonValue,
          configJson: readiness.config as unknown as Prisma.InputJsonValue
        }
      });
    }, { timeout: 30_000, maxWait: 10_000 });

    await this.cache.del(this.overviewCacheKey(walletAddress));
    await this.recordSyncJob(`wallet:${walletAddress}:latest`, walletAddress, "completed");
  }

  async getOverview(walletAddress: string): Promise<WalletOverview> {
    const cached = await this.cache.getJson<WalletOverview>(this.overviewCacheKey(walletAddress));
    if (cached) {
      return cached;
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { address: walletAddress },
      include: { metrics: true }
    });

    if (!wallet) {
      throw new NotFoundException("Wallet has not been synced");
    }

    const marketCount = await this.prisma.trade.groupBy({
      by: ["conditionId"],
      where: { walletAddress }
    });
    const lastTrade = await this.prisma.trade.findFirst({
      where: { walletAddress },
      orderBy: { timestamp: "desc" }
    });

    const overview: WalletOverview = {
      address: wallet.address,
      username: wallet.username,
      profileImage: wallet.profileImage,
      totalPnl: wallet.metrics?.totalPnl.toString() ?? "0",
      volume: wallet.metrics?.volume.toString() ?? "0",
      winrate: wallet.metrics?.winrate.toString() ?? "0",
      tradeCount: wallet.metrics?.tradeCount ?? 0,
      marketCount: marketCount.length,
      lastActivity: lastTrade?.timestamp.toISOString() ?? null,
      lastSyncedAt: wallet.lastSyncedAt?.toISOString() ?? null,
      drawdown: wallet.metrics?.drawdown.toString() ?? "0"
    };

    await this.cache.setJson(this.overviewCacheKey(walletAddress), overview, 15 * 60);
    return overview;
  }

  async getTrades(walletAddress: string, limit: number, offset: number): Promise<TradeRow[]> {
    const trades = await this.prisma.trade.findMany({
      where: { walletAddress },
      include: { market: true },
      orderBy: { timestamp: "asc" }
    });
    const tradeAnalytics = new Map(
      buildTradeHistoryAnalytics(
        trades.map((trade) => ({
          id: trade.id,
          marketId: trade.marketId,
          conditionId: trade.conditionId,
          outcome: trade.outcome,
          price: trade.price.toString(),
          size: trade.size.toString(),
          timestamp: trade.timestamp.toISOString(),
          side: trade.side
        }))
      ).map((trade) => [trade.tradeId, trade])
    );

    return trades
      .slice()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit)
      .map((trade) => {
        const analytics = tradeAnalytics.get(trade.id);

        return {
          id: trade.id,
          timestamp: trade.timestamp.toISOString(),
          marketId: trade.marketId,
          marketTitle: trade.market.title,
          marketSlug: trade.market.slug,
          conditionId: trade.conditionId,
          outcome: trade.outcome,
          price: trade.price.toString(),
          size: trade.size.toString(),
          value: trade.value.toString(),
          transactionHash: trade.transactionHash,
          side: analytics?.side ?? "buy",
          positionEffect: analytics?.positionEffect ?? "entry",
          realizedPnl: analytics?.realizedPnl ?? "0",
          result: analytics?.result ?? "open",
          remainingShares: analytics?.remainingShares ?? "0",
          marketResolved: trade.market.resolved
        };
      });
  }

  async getPositions(walletAddress: string): Promise<PositionRow[]> {
    const positions = await this.prisma.position.findMany({
      where: { walletAddress },
      include: { market: true }
    });

    const trades = await this.prisma.trade.findMany({
      where: { walletAddress },
      select: { marketId: true, outcome: true, price: true, size: true, side: true, timestamp: true },
      orderBy: { timestamp: "desc" }
    });
    const latestTradeByPosition = new Map<string, Date>();
    const totalBetByPosition = new Map<string, Prisma.Decimal>();
    const totalReturnedByPosition = new Map<string, Prisma.Decimal>();

    for (const trade of trades) {
      const key = this.positionKey(trade.marketId, trade.outcome);
      if (!latestTradeByPosition.has(key)) {
        latestTradeByPosition.set(key, trade.timestamp);
      }

      const value = trade.price.mul(trade.size.abs());
      if (this.normalizedTradeSide(trade.side) === "sell") {
        totalReturnedByPosition.set(key, (totalReturnedByPosition.get(key) ?? new Prisma.Decimal(0)).plus(value));
      } else {
        totalBetByPosition.set(key, (totalBetByPosition.get(key) ?? new Prisma.Decimal(0)).plus(value));
      }
    }

    return positions
      .map((position) => {
        const lastTradeAt = latestTradeByPosition.get(this.positionKey(position.marketId, position.outcome)) ?? null;
        const currentValue = position.currentShares
          .abs()
          .mul(position.averageEntryPrice)
          .plus(position.unrealizedPnl);

        return {
          id: position.id,
          marketId: position.marketId,
          marketTitle: position.market.title,
          marketSlug: position.market.slug,
          outcome: position.outcome,
          currentShares: position.currentShares.toString(),
          averageEntryPrice: position.averageEntryPrice.toString(),
          averageExitPrice: position.averageExitPrice.toString(),
          totalBet: (totalBetByPosition.get(this.positionKey(position.marketId, position.outcome)) ?? new Prisma.Decimal(0)).toString(),
          totalReturned: (totalReturnedByPosition.get(this.positionKey(position.marketId, position.outcome)) ?? new Prisma.Decimal(0)).toString(),
          currentValue: currentValue.toString(),
          realizedPnl: position.realizedPnl.toString(),
          unrealizedPnl: position.unrealizedPnl.toString(),
          totalPnl: position.totalPnl.toString(),
          confidenceScore: position.confidenceScore,
          lastTradeAt: lastTradeAt?.toISOString() ?? null
        };
      })
      .sort((a, b) => {
        const aTime = a.lastTradeAt ? new Date(a.lastTradeAt).getTime() : 0;
        const bTime = b.lastTradeAt ? new Date(b.lastTradeAt).getTime() : 0;
        return bTime - aTime;
      });
  }

  async getPnlChart(walletAddress: string): Promise<PnlChartPoint[]> {
    const trades = await this.prisma.trade.findMany({
      where: { walletAddress },
      orderBy: { timestamp: "asc" }
    });
    const positions = await this.prisma.position.findMany({ where: { walletAddress } });

    return buildPnlChart(
      trades.map((trade) => ({
        id: trade.id,
        marketId: trade.marketId,
        conditionId: trade.conditionId,
        outcome: trade.outcome,
        price: trade.price.toString(),
        size: trade.size.toString(),
        timestamp: trade.timestamp.toISOString(),
        side: trade.side
      })),
      positions.map((position) => ({
        marketId: position.marketId,
        conditionId: position.marketId,
        outcome: position.outcome,
        currentShares: position.currentShares.toString(),
        averageEntryPrice: position.averageEntryPrice.toString(),
        averageExitPrice: position.averageExitPrice.toString(),
        realizedPnl: position.realizedPnl.toString(),
        unrealizedPnl: position.unrealizedPnl.toString(),
        totalPnl: position.totalPnl.toString(),
        confidenceScore: position.confidenceScore
      }))
    );
  }

  async getPerformance(walletAddress: string): Promise<WalletPerformance> {
    const metrics = await this.getWalletMetrics(walletAddress);
    const marketTitles = await this.getMarketTitlesForHighlights(metrics.bestTradeJson, metrics.worstTradeJson);

    return {
      realizedPnl: metrics.realizedPnl.toString(),
      unrealizedPnl: metrics.unrealizedPnl.toString(),
      totalPnl: metrics.totalPnl.toString(),
      roi: metrics.roi.toString(),
      tradeWinrate: metrics.tradeWinrate.toString(),
      marketWinrate: metrics.marketWinrate.toString(),
      resolvedMarketWinrate: metrics.resolvedMarketWinrate.toString(),
      maxDrawdown: metrics.maxDrawdown.toString(),
      currentDrawdown: metrics.currentDrawdown.toString(),
      averageDrawdown: metrics.averageDrawdown.toString(),
      longestWinStreak: metrics.longestWinStreak,
      longestLossStreak: metrics.longestLossStreak,
      bestTrade: this.toTradeHighlight(metrics.bestTradeJson, marketTitles),
      worstTrade: this.toTradeHighlight(metrics.worstTradeJson, marketTitles)
    };
  }

  async getDrawdownChart(walletAddress: string): Promise<DrawdownChartPoint[]> {
    return buildDrawdownChart(await this.getPnlChart(walletAddress));
  }

  async getProfitDistribution(walletAddress: string): Promise<ProfitDistributionBucket[]> {
    const metrics = await this.getWalletMetrics(walletAddress);
    return this.toProfitDistribution(metrics.profitDistributionJson);
  }

  async getWinLossChart(walletAddress: string): Promise<WinLossChartPoint[]> {
    const metrics = await this.getWalletMetrics(walletAddress);
    return this.toWinLossChart(metrics.winLossChartJson);
  }

  async getCopyReadiness(walletAddress: string, config: CopyReadinessConfig): Promise<CopyReadiness> {
    const [wallet, trades, positions, persistedReadiness] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { address: walletAddress } }),
      this.prisma.trade.findMany({
        where: { walletAddress },
        include: { market: true },
        orderBy: { timestamp: "asc" }
      }),
      this.prisma.position.findMany({ where: { walletAddress } }),
      this.prisma.walletReadiness.findUnique({ where: { walletAddress } })
    ]);

    if (trades.length === 0 && positions.length === 0) {
      throw new NotFoundException("Wallet readiness has not been synced");
    }

    const marketTitleById = new Map(trades.map((trade) => [trade.conditionId, trade.market.title]));
    const enrichedMarkets = trades.map((trade) => ({
      marketId: trade.conditionId,
      category: inferMarketCategory(trade.market.category, trade.market.title, trade.market.slug, trade.market.rawJson)
    }));
    const readiness = calculateCopyReadiness({
      trades: trades.map((trade) => ({
        id: trade.id,
        marketId: trade.marketId,
        conditionId: trade.conditionId,
        outcome: trade.outcome,
        price: trade.price.toString(),
        size: trade.size.toString(),
        timestamp: trade.timestamp.toISOString(),
        side: trade.side
      })),
      positions: positions.map((position) => ({
        marketId: position.marketId,
        conditionId: position.marketId,
        outcome: position.outcome,
        currentShares: position.currentShares.toString(),
        averageEntryPrice: position.averageEntryPrice.toString(),
        averageExitPrice: position.averageExitPrice.toString(),
        realizedPnl: position.realizedPnl.toString(),
        unrealizedPnl: position.unrealizedPnl.toString(),
        totalPnl: position.totalPnl.toString(),
        confidenceScore: position.confidenceScore
      })),
      markets: enrichedMarkets,
      config
    });
    const dataValidation = this.buildDataValidation({
      trades,
      positions,
      wallet,
      markets: enrichedMarkets
    });

    return {
      ...readiness,
      oversizedTrades: readiness.oversizedTrades.map((trade) => ({
        ...trade,
        marketTitle: marketTitleById.get(trade.conditionId) ?? null
      })),
      dataValidation,
      interpretation: this.buildReadinessInterpretation(readiness, dataValidation),
      updatedAt: persistedReadiness?.updatedAt.toISOString() ?? null
    };
  }

  private static readonly delaySensitivitySeconds = [0, 60, 300, 900, 3600];
  // Bound the on-demand CLOB fetch per simulation. Markets are ordered by most recent
  // activity (delay accuracy matters most for active markets); the rest fall back to
  // the modeled slippage estimate in the engine.
  private static readonly maxPriceHistoryTokens = 300;
  private static readonly priceHistoryConcurrency = 8;
  private static readonly priceHistoryCacheTtlSeconds = 3600;

  private async getCachedPriceHistory(tokenId: string): Promise<CopyPriceHistorySeries["points"] | null> {
    const cacheKey = `clob:price-history:${tokenId}`;
    const cached = await this.cache.getJson<CopyPriceHistorySeries["points"]>(cacheKey);
    if (cached) {
      return cached;
    }
    const points = await this.polymarket.getPriceHistory(tokenId);
    if (points && points.length > 0) {
      await this.cache.setJson(cacheKey, points, WalletsService.priceHistoryCacheTtlSeconds);
      return points;
    }
    return null;
  }

  private async buildPriceHistory(
    trades: Array<{ marketId: string; outcome: string; timestamp: Date; rawJson: Prisma.JsonValue }>
  ): Promise<CopyPriceHistorySeries[]> {
    // One distinct (market, outcome) -> token spec, keyed off the asset id we already
    // store in each trade's rawJson. Most-recent markets first, capped.
    const specByKey = new Map<string, { marketId: string; outcome: string; token: string; lastTradeMs: number }>();
    for (const trade of trades) {
      const asset = this.extractAssetId(trade.rawJson);
      if (!asset) {
        continue;
      }
      const key = `${trade.marketId} ${trade.outcome}`;
      const lastTradeMs = trade.timestamp.getTime();
      const existing = specByKey.get(key);
      if (!existing) {
        specByKey.set(key, { marketId: trade.marketId, outcome: trade.outcome, token: asset, lastTradeMs });
      } else if (lastTradeMs > existing.lastTradeMs) {
        existing.lastTradeMs = lastTradeMs;
      }
    }

    const specs = [...specByKey.values()]
      .sort((a, b) => b.lastTradeMs - a.lastTradeMs)
      .slice(0, WalletsService.maxPriceHistoryTokens);

    const series: CopyPriceHistorySeries[] = [];
    for (let i = 0; i < specs.length; i += WalletsService.priceHistoryConcurrency) {
      const batch = specs.slice(i, i + WalletsService.priceHistoryConcurrency);
      const results = await Promise.all(
        batch.map(async (spec) => {
          const points = await this.getCachedPriceHistory(spec.token);
          return points && points.length > 0
            ? ({ marketId: spec.marketId, outcome: spec.outcome, points } satisfies CopyPriceHistorySeries)
            : null;
        })
      );
      for (const entry of results) {
        if (entry) {
          series.push(entry);
        }
      }
    }
    return series;
  }

  private extractAssetId(rawJson: Prisma.JsonValue): string | null {
    if (!rawJson || typeof rawJson !== "object" || Array.isArray(rawJson)) {
      return null;
    }
    const asset = (rawJson as Record<string, unknown>).asset;
    return typeof asset === "string" && asset.length > 0 ? asset : null;
  }

  async runCopySimulation(
    walletAddress: string,
    settings: ParsedCopySimulationSettings
  ): Promise<CopySimulationRecord> {
    const trades = await this.prisma.trade.findMany({
      where: { walletAddress },
      include: { market: true },
      orderBy: { timestamp: "asc" }
    });

    if (trades.length === 0) {
      throw new NotFoundException("Wallet has not been synced");
    }

    const analyticsTrades: AnalyticsTrade[] = trades.map((trade) => ({
      id: trade.id,
      marketId: trade.marketId,
      conditionId: trade.conditionId,
      outcome: trade.outcome,
      price: trade.price.toString(),
      size: trade.size.toString(),
      timestamp: trade.timestamp.toISOString(),
      side: trade.side
    }));
    const markets = trades.map((trade) => ({
      marketId: trade.conditionId,
      category: inferMarketCategory(trade.market.category, trade.market.title, trade.market.slug, trade.market.rawJson),
      resolved: trade.market.resolved
    }));
    // Only resolved markets get a deterministic mark price (1/0). Unresolved copier
    // positions stay valued at cost, so unrealized PnL never relies on stale quotes.
    const marketPrices: MarketPrice[] = [];
    const pricedOutcomes = new Set<string>();
    for (const trade of trades) {
      const key = `${trade.conditionId}:${trade.outcome}`;
      if (!trade.market.resolved || pricedOutcomes.has(key)) {
        continue;
      }
      pricedOutcomes.add(key);
      marketPrices.push({
        marketId: trade.conditionId,
        outcome: trade.outcome,
        price: "0",
        resolved: true,
        winningOutcome: trade.market.winningOutcome
      });
    }

    const priceHistory = await this.buildPriceHistory(trades);
    const input: CopySimulationInput = {
      trades: analyticsTrades,
      markets,
      marketPrices,
      priceHistory,
      settings
    };
    const simulation = simulateCopyTrading(input);
    const delaySensitivity = simulateDelaySensitivity(input, WalletsService.delaySensitivitySeconds);
    const titleByConditionId = new Map(trades.map((trade) => [trade.conditionId, trade.market.title]));
    const result: CopySimulationResult = {
      settings: simulation.settings as unknown as CopySimulationSettings,
      summary: simulation.summary,
      ledger: simulation.ledger.map((row) => ({
        ...row,
        marketTitle: titleByConditionId.get(row.conditionId) ?? null
      })),
      missedTrades: simulation.missedTrades.map((row) => ({
        ...row,
        marketTitle: titleByConditionId.get(row.conditionId) ?? null
      })),
      equityCurve: simulation.equityCurve,
      categoryBreakdown: simulation.categoryBreakdown,
      delaySensitivity
    };

    const stored = await this.prisma.copySimulation.create({
      data: {
        walletAddress,
        settingsJson: result.settings as unknown as Prisma.InputJsonValue,
        resultJson: result as unknown as Prisma.InputJsonValue
      }
    });

    return {
      id: stored.id,
      walletAddress,
      createdAt: stored.createdAt.toISOString(),
      settings: result.settings,
      result
    };
  }

  async getCopySizingSuggestion(walletAddress: string): Promise<CopySizingSuggestion> {
    const trades = await this.prisma.trade.findMany({
      where: { walletAddress },
      orderBy: { timestamp: "asc" }
    });

    return buildCopySizingSuggestion(
      trades.map((trade) => ({
        id: trade.id,
        marketId: trade.marketId,
        conditionId: trade.conditionId,
        outcome: trade.outcome,
        price: trade.price.toString(),
        size: trade.size.toString(),
        timestamp: trade.timestamp.toISOString(),
        side: trade.side
      }))
    );
  }

  async listCopySimulations(walletAddress: string): Promise<CopySimulationListItem[]> {
    const simulations = await this.prisma.copySimulation.findMany({
      where: { walletAddress },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return simulations.map((simulation) => ({
      id: simulation.id,
      walletAddress: simulation.walletAddress,
      createdAt: simulation.createdAt.toISOString(),
      settings: simulation.settingsJson as unknown as CopySimulationSettings,
      summary: (simulation.resultJson as unknown as CopySimulationResult).summary as CopySimulationSummary
    }));
  }

  async getCopySimulation(walletAddress: string, id: string): Promise<CopySimulationRecord> {
    const simulation = await this.prisma.copySimulation.findFirst({ where: { id, walletAddress } });

    if (!simulation) {
      throw new NotFoundException("Copy simulation not found");
    }

    return {
      id: simulation.id,
      walletAddress: simulation.walletAddress,
      createdAt: simulation.createdAt.toISOString(),
      settings: simulation.settingsJson as unknown as CopySimulationSettings,
      result: simulation.resultJson as unknown as CopySimulationResult
    };
  }

  async getCategoryExposure(walletAddress: string, config: CopyReadinessConfig): Promise<CategoryExposure[]> {
    return (await this.getCopyReadiness(walletAddress, config)).categoryExposure;
  }

  async getOversizedTrades(walletAddress: string, config: CopyReadinessConfig): Promise<OversizedTrade[]> {
    return (await this.getCopyReadiness(walletAddress, config)).oversizedTrades;
  }

  private async upsertMarket(tx: Prisma.TransactionClient, market: NormalizedMarket): Promise<void> {
    await tx.market.upsert({
      where: { conditionId: market.conditionId },
      create: {
        conditionId: market.conditionId,
        slug: market.slug,
        title: market.title,
        category: market.category,
        endDate: market.endDate ? new Date(market.endDate) : null,
        resolved: market.resolved,
        winningOutcome: market.winningOutcome,
        lastKnownPrice: market.lastKnownPrice ? new Prisma.Decimal(market.lastKnownPrice) : null,
        rawJson: market.rawJson as Prisma.InputJsonValue,
        source: market.metadata.source,
        fetchedAt: new Date(market.metadata.fetchedAt),
        adapterVersion: market.metadata.adapterVersion
      },
      update: {
        slug: market.slug,
        title: market.title,
        category: market.category,
        endDate: market.endDate ? new Date(market.endDate) : null,
        resolved: market.resolved,
        winningOutcome: market.winningOutcome,
        lastKnownPrice: market.lastKnownPrice ? new Prisma.Decimal(market.lastKnownPrice) : undefined,
        rawJson: market.rawJson as Prisma.InputJsonValue,
        source: market.metadata.source,
        fetchedAt: new Date(market.metadata.fetchedAt),
        adapterVersion: market.metadata.adapterVersion
      }
    });
  }

  private enrichMarketsFromTrades(markets: NormalizedMarket[], trades: NormalizedTrade[]): NormalizedMarket[] {
    const tradeByConditionId = new Map<string, NormalizedTrade>();
    for (const trade of trades) {
      const existing = tradeByConditionId.get(trade.conditionId);
      if (!existing || (!existing.marketTitle && trade.marketTitle)) {
        tradeByConditionId.set(trade.conditionId, trade);
      }
    }

    return markets.map((market) => {
      const trade = tradeByConditionId.get(market.conditionId);
      if (!trade) {
        return market;
      }

      return {
        ...market,
        title: market.title ?? trade.marketTitle,
        slug: market.slug ?? trade.marketSlug,
        category: inferMarketCategory(
          market.category,
          market.title ?? trade.marketTitle,
          market.slug ?? trade.marketSlug,
          market.rawJson
        ),
        rawJson:
          market.title || market.slug
            ? market.rawJson
            : {
                market: market.rawJson,
                tradeMarket: trade.rawJson
              }
      };
    });
  }

  private toAnalyticsTrades(trades: NormalizedTrade[]): AnalyticsTrade[] {
    return trades.map((trade) => ({
      id: trade.id,
      marketId: trade.marketId,
      conditionId: trade.conditionId,
      outcome: trade.outcome,
      price: trade.price,
      size: trade.size,
      timestamp: trade.timestamp,
      side: trade.side
    }));
  }

  private dedupeTradesForPersistence(trades: NormalizedTrade[]): NormalizedTrade[] {
    const seen = new Set<string>();

    return trades.filter((trade) => {
      if (!trade.transactionHash) {
        return true;
      }

      const key = [
        trade.transactionHash,
        trade.conditionId,
        trade.outcome,
        new Date(trade.timestamp).toISOString()
      ].join("\u0000");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private positionKey(marketId: string, outcome: string): string {
    return `${marketId}:${outcome}`;
  }

  private normalizedTradeSide(side: string | null): "buy" | "sell" {
    const normalized = side?.toLowerCase();
    return normalized === "sell" || normalized === "sold" || normalized === "ask" ? "sell" : "buy";
  }

  private buildDataValidation(input: {
    trades: Array<{
      timestamp: Date;
      conditionId: string;
      adapterVersion: string | null;
      source: string | null;
    }>;
    positions: unknown[];
    wallet: { lastSyncedAt: Date | null; adapterVersion: string | null; source: string | null } | null;
    markets: Array<{ marketId: string; category: string | null }>;
  }): CopyReadinessDataValidation {
    const marketIds = new Set(input.trades.map((trade) => trade.conditionId));
    const oldestTrade = input.trades[0] ?? null;
    const latestTrade = input.trades.at(-1) ?? null;
    const knownCategoryMarkets = new Set(
      input.markets
        .filter((market) => market.category && market.category !== "Unknown")
        .map((market) => market.marketId)
    );
    const syncedWindowDays =
      oldestTrade && latestTrade
        ? Math.max(1, Math.ceil((latestTrade.timestamp.getTime() - oldestTrade.timestamp.getTime()) / 86_400_000) + 1)
        : 0;
    const categoryCoverageRatio =
      marketIds.size === 0 ? "0" : new Prisma.Decimal(knownCategoryMarkets.size).div(marketIds.size).toDecimalPlaces(8).toString();
    const apiWindowLimited = input.trades.length >= 3900;

    return {
      tradeCount: input.trades.length,
      marketCount: marketIds.size,
      positionCount: input.positions.length,
      oldestTradeAt: oldestTrade?.timestamp.toISOString() ?? null,
      latestTradeAt: latestTrade?.timestamp.toISOString() ?? null,
      lastSyncedAt: input.wallet?.lastSyncedAt?.toISOString() ?? null,
      syncedWindowDays,
      categoryCoverageRatio,
      unknownCategoryMarketCount: Math.max(0, marketIds.size - knownCategoryMarkets.size),
      source: input.wallet?.source ?? latestTrade?.source ?? "data",
      adapterVersion: input.wallet?.adapterVersion ?? latestTrade?.adapterVersion ?? null,
      coverageNote: apiWindowLimited
        ? "This wallet is at the current public Data API sync window. Treat lifetime conclusions as incomplete until deeper history sources are added."
        : "This summary reflects the stored public adapter history for the wallet.",
      apiWindowLimited
    };
  }

  private buildReadinessInterpretation(
    readiness: Omit<CopyReadiness, "updatedAt" | "dataValidation" | "interpretation">,
    dataValidation: CopyReadinessDataValidation
  ): CopyReadinessInterpretation {
    const criticalWarnings = readiness.warnings.filter((warning) => warning.severity === "critical");
    const hasWeakCategories = Number(dataValidation.categoryCoverageRatio) < 0.5;
    const status: CopyReadinessInterpretation["status"] =
      criticalWarnings.length > 0 || readiness.readinessScore < 50
        ? "avoid"
        : readiness.readinessScore >= 75 && !dataValidation.apiWindowLimited
          ? "ready"
          : "watch";

    const nextActions = [
      dataValidation.apiWindowLimited ? "Use this as a public-window sample, not full lifetime proof." : "Review latest trades before simulation.",
      hasWeakCategories ? "Treat category exposure as partial until more market metadata is available." : "Use category exposure to check concentration risk.",
      readiness.oversizedTradeSummary.count > 0 ? "Cap or skip oversized trades in the future simulator." : "Default copy size rules fit the observed trades."
    ];

    if (status === "avoid") {
      return {
        status,
        title: "Do not copy yet",
        message: "The available evidence has critical readiness issues or a weak score. Keep this wallet on a watchlist until the risks improve.",
        nextActions
      };
    }

    if (status === "ready") {
      return {
        status,
        title: "Ready for simulation",
        message: "The wallet has fresh, broad, and size-compatible evidence. It is ready to evaluate in the next simulator version.",
        nextActions
      };
    }

    return {
      status,
      title: "Watch before simulation",
      message: "The wallet has useful evidence, but coverage, category quality, or oversized-trade risk means it should be validated before copy simulation.",
      nextActions
    };
  }

  private async getWalletMetrics(walletAddress: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { address: walletAddress },
      include: { metrics: true }
    });

    if (!wallet?.metrics) {
      throw new NotFoundException("Wallet metrics have not been synced");
    }

    return wallet.metrics;
  }

  private async getMarketTitlesForHighlights(
    bestTradeJson: Prisma.JsonValue | null,
    worstTradeJson: Prisma.JsonValue | null
  ): Promise<Map<string, string | null>> {
    const highlights = [this.toTradeHighlight(bestTradeJson), this.toTradeHighlight(worstTradeJson)].filter(
      (highlight): highlight is TradeHighlight => highlight !== null
    );
    const marketIds = [...new Set(highlights.map((highlight) => highlight.marketId))];

    if (marketIds.length === 0) {
      return new Map();
    }

    const markets = await this.prisma.market.findMany({
      where: { conditionId: { in: marketIds } },
      select: { conditionId: true, title: true }
    });

    return new Map(markets.map((market) => [market.conditionId, market.title]));
  }

  private toTradeHighlight(
    value: Prisma.JsonValue | null,
    marketTitles = new Map<string, string | null>()
  ): TradeHighlight | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    const candidate = value as Record<string, unknown>;
    if (
      typeof candidate.tradeId !== "string" ||
      typeof candidate.marketId !== "string" ||
      typeof candidate.conditionId !== "string" ||
      typeof candidate.outcome !== "string" ||
      typeof candidate.timestamp !== "string" ||
      typeof candidate.pnl !== "string" ||
      typeof candidate.price !== "string" ||
      typeof candidate.size !== "string"
    ) {
      return null;
    }

    return {
      tradeId: candidate.tradeId,
      marketId: candidate.marketId,
      conditionId: candidate.conditionId,
      outcome: candidate.outcome,
      timestamp: candidate.timestamp,
      pnl: candidate.pnl,
      price: candidate.price,
      size: candidate.size,
      marketTitle: marketTitles.get(candidate.marketId) ?? null
    };
  }

  private toProfitDistribution(value: Prisma.JsonValue | null): ProfitDistributionBucket[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item) ||
        typeof item.bucket !== "string" ||
        typeof item.count !== "number"
      ) {
        return [];
      }

      return [{ bucket: item.bucket, count: item.count }];
    });
  }

  private toWinLossChart(value: Prisma.JsonValue | null): WinLossChartPoint[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item) ||
        typeof item.date !== "string" ||
        typeof item.wins !== "number" ||
        typeof item.losses !== "number"
      ) {
        return [];
      }

      return [{ date: item.date, wins: item.wins, losses: item.losses }];
    });
  }

  private jsonOrNull(value: unknown): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
    return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }

  private overviewCacheKey(walletAddress: string): string {
    return `wallet:${walletAddress}:overview`;
  }
}
