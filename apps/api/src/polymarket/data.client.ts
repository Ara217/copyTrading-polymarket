import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Decimal from "decimal.js";
import { adapterVersion, polymarketTradeSchema } from "@polyand/shared";
import { asArray, fetchJson } from "./http";
import { NormalizedTrade } from "./types";

@Injectable()
export class DataClient {
  private readonly baseUrl: string;
  private readonly tradePageSize: number;
  private readonly maxTradePages: number;
  private readonly maxTradeOffset: number;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>("POLYMARKET_DATA_BASE_URL") ?? "https://data-api.polymarket.com";
    this.tradePageSize = this.readPositiveInteger(config, "POLYMARKET_DATA_TRADE_PAGE_SIZE", 1000);
    this.maxTradePages = this.readPositiveInteger(config, "POLYMARKET_DATA_MAX_TRADE_PAGES", 100);
    this.maxTradeOffset = this.readPositiveInteger(config, "POLYMARKET_DATA_MAX_TRADE_OFFSET", 3000);
  }

  async getWalletTrades(walletAddress: string): Promise<NormalizedTrade[]> {
    const fetchedAt = new Date().toISOString();
    const pages: unknown[] = [];

    for (let page = 0; page < this.maxTradePages; page += 1) {
      const offset = page * this.tradePageSize;
      if (offset > this.maxTradeOffset) {
        break;
      }

      const rawPage = await this.getWalletTradePage(walletAddress, offset);
      const items = asArray(rawPage);
      pages.push(...items);

      if (items.length < this.tradePageSize) {
        break;
      }
    }

    return pages.flatMap((item) => this.normalizeTrade(item, walletAddress, fetchedAt));
  }

  private async getWalletTradePage(walletAddress: string, offset: number): Promise<unknown> {
    const url = new URL("/trades", this.baseUrl);
    url.searchParams.set("user", walletAddress);
    url.searchParams.set("limit", String(this.tradePageSize));
    url.searchParams.set("offset", String(offset));

    return fetchJson<unknown>(url.toString());
  }

  private normalizeTrade(item: unknown, walletAddress: string, fetchedAt: string): NormalizedTrade[] {
    const parsed = polymarketTradeSchema.safeParse(item);
    if (!parsed.success) {
      return [];
    }
    const trade = parsed.data;
    const conditionId = trade.conditionId ?? trade.condition_id ?? trade.market ?? trade.marketId ?? "";
    const rawTokenId = trade.asset ?? trade.asset_id ?? trade.tokenId ?? trade.token_id ?? null;
    const tokenId = rawTokenId === null || rawTokenId === undefined ? null : String(rawTokenId);
    if (!conditionId) {
      return [];
    }
    const price = new Decimal(trade.price.toString());
    const size = new Decimal(trade.size.toString()).abs();
    const timestamp =
      trade.timestamp instanceof Date
        ? trade.timestamp.toISOString()
        : typeof trade.timestamp === "number"
          ? new Date(trade.timestamp * 1000).toISOString()
          : new Date(trade.timestamp).toISOString();

    return [
      {
        id: String(trade.id ?? `${conditionId}:${trade.outcome}:${timestamp}`),
        walletAddress,
        marketId: conditionId,
        conditionId,
        tokenId,
        outcome: trade.outcome,
        price: price.toString(),
        size: size.toString(),
        value: price.mul(size).toString(),
        side: trade.side ?? null,
        timestamp,
        transactionHash: trade.transactionHash ?? trade.transaction_hash ?? trade.txHash ?? null,
        marketTitle: trade.title ?? null,
        marketSlug: trade.slug ?? null,
        rawJson: item,
        metadata: {
          source: "data",
          fetchedAt,
          adapterVersion
        }
      } satisfies NormalizedTrade
    ];
  }

  private readPositiveInteger(config: ConfigService, key: string, fallback: number): number {
    const value = config.get<string | number>(key);
    const parsed = Number(value ?? fallback);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
