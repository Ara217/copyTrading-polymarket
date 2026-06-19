import { Injectable, Logger } from "@nestjs/common";
import { parseWalletAddress, polymarketUsernameSchema } from "@polyand/shared";
import { DataClient } from "./data.client";
import { GammaClient } from "./gamma.client";
import { ClobClient, type ClobPriceHistoryPoint } from "./clob.client";
import { MarketPriceSnapshot, NormalizedMarket, NormalizedPosition, NormalizedTrade } from "./types";

@Injectable()
export class PolymarketService {
  private readonly logger = new Logger(PolymarketService.name);

  constructor(
    private readonly dataClient: DataClient,
    private readonly gammaClient: GammaClient,
    private readonly clobClient: ClobClient
  ) {}

  async getWalletTrades(walletAddress: string): Promise<NormalizedTrade[]> {
    return this.dataClient.getWalletTrades(walletAddress);
  }

  async getWalletPositions(walletAddress: string): Promise<NormalizedPosition[]> {
    return this.dataClient.getWalletPositions(walletAddress);
  }

  async resolveProfileSlug(profileSlug: string): Promise<string | null> {
    const resolved = await this.resolveProfileIdentifier(profileSlug);
    return resolved?.address ?? null;
  }

  /**
   * Resolve a Polymarket profile identifier (slug like `0x...-<timestamp>`, or
   * a username like `inaccuratestake`) to its embedded `0x...` wallet address.
   *
   * Username inputs are validated against `polymarketUsernameSchema` before the
   * upstream fetch. We scrape the same `polymarket.com/profile/<id>` HTML for
   * both shapes — there is no documented JSON endpoint, and the rendered page
   * embeds `proxyWallet` for slugs *and* usernames. Returns `null` when the
   * page does not yield an address; callers MUST treat that as "not found"
   * and never substitute another wallet.
   */
  async resolveProfileIdentifier(input: string): Promise<{ address: string; username: string | null } | null> {
    const trimmed = String(input ?? "").trim();
    if (!trimmed) return null;

    let target = trimmed;
    let username: string | null = null;
    if (!/^0x[a-fA-F0-9]{40}(-\d+)?$/.test(trimmed)) {
      const parsed = polymarketUsernameSchema.safeParse(trimmed);
      if (!parsed.success) return null;
      target = parsed.data;
      username = parsed.data;
    }

    const response = await fetch(`https://polymarket.com/profile/${encodeURIComponent(target)}`, {
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

    // When the input was a slug we can still surface the embedded username if the page exposes one.
    if (!username) {
      const usernameMatch = html.match(/"name":"([a-zA-Z0-9_.-]{1,32})"/);
      if (usernameMatch?.[1]) {
        const candidate = polymarketUsernameSchema.safeParse(usernameMatch[1]);
        if (candidate.success) username = candidate.data;
      }
    }

    return { address: parseWalletAddress(proxyWalletMatch[1]), username };
  }

  async getMarkets(conditionIds: string[]): Promise<NormalizedMarket[]> {
    return this.gammaClient.getMarketsByConditionIds(conditionIds);
  }

  async getPriceHistory(tokenId: string): Promise<ClobPriceHistoryPoint[] | null> {
    return this.clobClient.getPriceHistory(tokenId);
  }

  async getPriceSnapshots(markets: NormalizedMarket[], trades: NormalizedTrade[]): Promise<MarketPriceSnapshot[]> {
    const latestTradePrice = new Map<string, NormalizedTrade>();
    for (const trade of trades) {
      const existing = latestTradePrice.get(`${trade.marketId}:${trade.outcome}`);
      if (!existing || new Date(trade.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
        latestTradePrice.set(`${trade.marketId}:${trade.outcome}`, trade);
      }
    }

    const latest = [...latestTradePrice.values()];
    const clobPrices = await Promise.all(
      latest.map((trade) =>
        trade.tokenId ? this.clobClient.getMidpointPrice(trade.tokenId, trade.outcome) : Promise.resolve(null)
      )
    );

    const marketById = new Map(markets.map((market) => [market.conditionId, market]));

    // Fallback: when CLOB book is empty AND gamma hasn't flagged the market resolved,
    // probe `/markets/<conditionId>` which exposes authoritative resolution state
    // (often hours before gamma catches up).
    const resolutionLookups = await Promise.all(
      latest.map((trade, index) => {
        if (clobPrices[index]) {
          return Promise.resolve(null);
        }
        if (marketById.get(trade.conditionId)?.resolved) {
          return Promise.resolve(null);
        }
        return this.clobClient.getMarketResolution(trade.conditionId);
      })
    );

    return latest.map((trade, index) => {
      const market = marketById.get(trade.conditionId);
      const clobPrice = clobPrices[index];
      const resolution = resolutionLookups[index];
      const gammaResolved = market?.resolved ?? false;
      const clobResolved = resolution?.closed && resolution.winningOutcome !== null;
      const resolved = gammaResolved || Boolean(clobResolved);
      const winningOutcome = market?.winningOutcome ?? resolution?.winningOutcome ?? null;

      let price = clobPrice?.price ?? trade.price;
      let markedToMarket = Boolean(clobPrice) || gammaResolved;

      if (!clobPrice && clobResolved) {
        const outcomePrice = resolution?.outcomes.find((o) => o.outcome === trade.outcome)?.price;
        if (outcomePrice !== undefined) {
          price = outcomePrice;
          markedToMarket = true;
        }
      }

      if (!markedToMarket) {
        this.logger.warn(
          `getPriceSnapshots: falling back to last-fill price for ${trade.conditionId}/${trade.outcome}; tokenId=${trade.tokenId ?? "null"} (mark-to-market unavailable)`
        );
      }

      return {
        marketId: trade.marketId,
        outcome: trade.outcome,
        price,
        resolved,
        winningOutcome,
        markedToMarket
      };
    });
  }
}
