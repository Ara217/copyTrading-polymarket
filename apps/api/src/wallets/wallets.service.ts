import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  buildPnlChart,
  calculateWalletMetrics,
  reconstructPositions,
  type AnalyticsTrade
} from "@polyand/analytics";
import { type PnlChartPoint, type PositionRow, type TradeRow, type WalletOverview } from "@polyand/types";
import { CacheService } from "../cache/cache.service";
import { PolymarketService } from "../polymarket/polymarket.service";
import { NormalizedMarket, NormalizedTrade } from "../polymarket/types";
import { PrismaService } from "../prisma/prisma.service";
import { parseWalletAddress, polymarketProfileSlugSchema, walletAddressFromProfileSlug } from "@polyand/shared";

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
    const trades = await this.polymarket.getWalletTrades(walletAddress);
    const markets = this.enrichMarketsFromTrades(
      await this.polymarket.getMarkets(trades.map((trade) => trade.conditionId)),
      trades
    );
    const priceSnapshots = await this.polymarket.getPriceSnapshots(markets, trades);
    const positions = reconstructPositions(this.toAnalyticsTrades(trades), priceSnapshots);
    const metrics = calculateWalletMetrics(this.toAnalyticsTrades(trades), positions);

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
          tradeCount: metrics.tradeCount
        },
        update: {
          totalPnl: new Prisma.Decimal(metrics.totalPnl),
          winrate: new Prisma.Decimal(metrics.winrate),
          volume: new Prisma.Decimal(metrics.volume),
          drawdown: new Prisma.Decimal(metrics.drawdown),
          tradeCount: metrics.tradeCount
        }
      });
    });

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
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset
    });

    return trades.map((trade) => ({
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
      transactionHash: trade.transactionHash
    }));
  }

  async getPositions(walletAddress: string): Promise<PositionRow[]> {
    const positions = await this.prisma.position.findMany({
      where: { walletAddress },
      include: { market: true },
      orderBy: { totalPnl: "desc" }
    });

    return positions.map((position) => ({
      id: position.id,
      marketId: position.marketId,
      marketTitle: position.market.title,
      marketSlug: position.market.slug,
      outcome: position.outcome,
      currentShares: position.currentShares.toString(),
      averageEntryPrice: position.averageEntryPrice.toString(),
      averageExitPrice: position.averageExitPrice.toString(),
      realizedPnl: position.realizedPnl.toString(),
      unrealizedPnl: position.unrealizedPnl.toString(),
      totalPnl: position.totalPnl.toString(),
      confidenceScore: position.confidenceScore
    }));
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

  private overviewCacheKey(walletAddress: string): string {
    return `wallet:${walletAddress}:overview`;
  }
}
