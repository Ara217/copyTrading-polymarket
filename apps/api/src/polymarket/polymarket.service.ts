import { Injectable } from "@nestjs/common";
import { parseWalletAddress } from "@polyand/shared";
import { DataClient } from "./data.client";
import { GammaClient } from "./gamma.client";
import { ClobClient } from "./clob.client";
import { MarketPriceSnapshot, NormalizedMarket, NormalizedTrade } from "./types";

@Injectable()
export class PolymarketService {
  constructor(
    private readonly dataClient: DataClient,
    private readonly gammaClient: GammaClient,
    private readonly clobClient: ClobClient
  ) {}

  async getWalletTrades(walletAddress: string): Promise<NormalizedTrade[]> {
    return this.dataClient.getWalletTrades(walletAddress);
  }

  async resolveProfileSlug(profileSlug: string): Promise<string | null> {
    const response = await fetch(`https://polymarket.com/profile/${encodeURIComponent(profileSlug)}`, {
      headers: {
        accept: "text/html",
        "user-agent": "polyand-analytics/0.1"
      }
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const proxyWalletMatch = html.match(/"proxyWallet":"(0x[a-fA-F0-9]{40})"/);
    if (!proxyWalletMatch?.[1]) {
      return null;
    }

    return parseWalletAddress(proxyWalletMatch[1]);
  }

  async getMarkets(conditionIds: string[]): Promise<NormalizedMarket[]> {
    return this.gammaClient.getMarketsByConditionIds(conditionIds);
  }

  async getPriceSnapshots(markets: NormalizedMarket[], trades: NormalizedTrade[]): Promise<MarketPriceSnapshot[]> {
    const latestTradePrice = new Map<string, NormalizedTrade>();
    for (const trade of trades) {
      latestTradePrice.set(`${trade.marketId}:${trade.outcome}`, trade);
    }

    const clobPrices = await Promise.all(
      [...latestTradePrice.values()].map((trade) =>
        this.clobClient.getMidpointPrice(trade.marketId, trade.outcome)
      )
    );

    const marketById = new Map(markets.map((market) => [market.conditionId, market]));

    return [...latestTradePrice.values()].map((trade, index) => {
      const market = marketById.get(trade.conditionId);
      const clobPrice = clobPrices[index];
      return {
        marketId: trade.marketId,
        outcome: trade.outcome,
        price: clobPrice?.price ?? trade.price,
        resolved: market?.resolved ?? false,
        winningOutcome: market?.winningOutcome ?? null
      };
    });
  }
}
