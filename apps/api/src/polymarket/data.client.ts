import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Decimal from "decimal.js";
import { adapterVersion, polymarketPositionSchema, polymarketTradeSchema } from "@polyand/shared";
import { asArray, fetchJson } from "./http";
import { NormalizedPosition, NormalizedTrade } from "./types";

@Injectable()
export class DataClient {
  private readonly baseUrl: string;
  private readonly tradePageSize: number;
  private readonly maxTradePages: number;
  private readonly maxTradeOffset: number;
  private readonly positionPageSize: number;
  private readonly maxPositionPages: number;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>("POLYMARKET_DATA_BASE_URL") ?? "https://data-api.polymarket.com";
    this.tradePageSize = this.readPositiveInteger(config, "POLYMARKET_DATA_TRADE_PAGE_SIZE", 1000);
    this.maxTradePages = this.readPositiveInteger(config, "POLYMARKET_DATA_MAX_TRADE_PAGES", 100);
    this.maxTradeOffset = this.readPositiveInteger(config, "POLYMARKET_DATA_MAX_TRADE_OFFSET", 3000);
    this.positionPageSize = this.readPositiveInteger(config, "POLYMARKET_DATA_POSITION_PAGE_SIZE", 500);
    this.maxPositionPages = this.readPositiveInteger(config, "POLYMARKET_DATA_MAX_POSITION_PAGES", 20);
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

  async getWalletPositions(walletAddress: string): Promise<NormalizedPosition[]> {
    const fetchedAt = new Date().toISOString();
    const pages: unknown[] = [];

    for (let page = 0; page < this.maxPositionPages; page += 1) {
      const offset = page * this.positionPageSize;
      const rawPage = await this.getWalletPositionPage(walletAddress, offset);
      const items = asArray(rawPage);
      pages.push(...items);

      if (items.length < this.positionPageSize) {
        break;
      }
    }

    return pages.flatMap((item) => this.normalizePosition(item, walletAddress, fetchedAt));
  }

  private async getWalletPositionPage(walletAddress: string, offset: number): Promise<unknown> {
    const url = new URL("/positions", this.baseUrl);
    url.searchParams.set("user", walletAddress);
    url.searchParams.set("sizeThreshold", "0");
    url.searchParams.set("limit", String(this.positionPageSize));
    url.searchParams.set("offset", String(offset));

    return fetchJson<unknown>(url.toString());
  }

  private normalizePosition(item: unknown, walletAddress: string, fetchedAt: string): NormalizedPosition[] {
    const parsed = polymarketPositionSchema.safeParse(item);
    if (!parsed.success) {
      return [];
    }
    const row = parsed.data;
    const conditionId = row.conditionId ?? row.condition_id ?? "";
    if (!conditionId) {
      return [];
    }
    const tokenIdRaw = row.asset ?? row.asset_id ?? null;
    const tokenId = tokenIdRaw === null || tokenIdRaw === undefined ? null : String(tokenIdRaw);
    const toStr = (value: unknown): string | null =>
      value === null || value === undefined ? null : new Decimal(value.toString()).toString();
    const size = new Decimal(row.size.toString()).toString();
    const eventIdRaw = row.eventId ?? row.event_id ?? null;
    const eventId = eventIdRaw === null || eventIdRaw === undefined ? null : String(eventIdRaw);
    const eventSlug = row.eventSlug ?? row.event_slug ?? null;

    return [
      {
        walletAddress,
        conditionId,
        tokenId,
        outcome: row.outcome,
        size,
        avgPrice: toStr(row.avgPrice),
        curPrice: toStr(row.curPrice),
        initialValue: toStr(row.initialValue),
        currentValue: toStr(row.currentValue),
        cashPnl: toStr(row.cashPnl),
        percentPnl: toStr(row.percentPnl),
        realizedPnl: toStr(row.realizedPnl),
        redeemable: row.redeemable ?? null,
        mergeable: row.mergeable ?? null,
        negativeRisk: row.negativeRisk ?? row.negative_risk ?? null,
        marketTitle: row.title ?? null,
        marketSlug: row.slug ?? null,
        eventId,
        eventSlug,
        rawJson: item,
        metadata: {
          source: "data",
          fetchedAt,
          adapterVersion
        }
      } satisfies NormalizedPosition
    ];
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
