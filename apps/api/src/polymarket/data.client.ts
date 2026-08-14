import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Decimal from "decimal.js";
import {
  adapterVersion,
  polymarketClosedPositionSchema,
  polymarketPositionSchema,
  polymarketTradeSchema
} from "@polyand/shared";
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
  private readonly maxClosedPositionPages: number;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>("POLYMARKET_DATA_BASE_URL") ?? "https://data-api.polymarket.com";
    this.tradePageSize = this.readPositiveInteger(config, "POLYMARKET_DATA_TRADE_PAGE_SIZE", 1000);
    this.maxTradePages = this.readPositiveInteger(config, "POLYMARKET_DATA_MAX_TRADE_PAGES", 100);
    this.maxTradeOffset = this.readPositiveInteger(config, "POLYMARKET_DATA_MAX_TRADE_OFFSET", 3000);
    this.positionPageSize = this.readPositiveInteger(config, "POLYMARKET_DATA_POSITION_PAGE_SIZE", 500);
    this.maxPositionPages = this.readPositiveInteger(config, "POLYMARKET_DATA_MAX_POSITION_PAGES", 20);
    // API clamps /closed-positions pages to 50 rows regardless of limit; whales run
    // 15k+ closed rows, so the ceiling must be high. Loop exits on first short page,
    // so small wallets still pay a single request. ponytail: sequential fetch —
    // ~400 requests/whale refresh; batch-parallelize if refresh latency matters.
    this.maxClosedPositionPages = this.readPositiveInteger(config, "POLYMARKET_DATA_MAX_CLOSED_POSITION_PAGES", 400);
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

  /**
   * data-api /closed-positions: resolved/redeemed round trips with authoritative
   * realizedPnl — history the /trades window cannot reach. API caps limit at 50.
   */
  async getWalletClosedPositions(walletAddress: string): Promise<NormalizedPosition[]> {
    const fetchedAt = new Date().toISOString();
    const pageSize = 50;
    const pages: unknown[] = [];

    for (let page = 0; page < this.maxClosedPositionPages; page += 1) {
      const url = new URL("/closed-positions", this.baseUrl);
      url.searchParams.set("user", walletAddress);
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(page * pageSize));
      url.searchParams.set("sortBy", "TIMESTAMP");
      const items = asArray(await fetchJson<unknown>(url.toString()));
      pages.push(...items);
      if (items.length < pageSize) {
        break;
      }
    }

    return pages.flatMap((item) => this.normalizeClosedPosition(item, walletAddress, fetchedAt));
  }

  private normalizeClosedPosition(item: unknown, walletAddress: string, fetchedAt: string): NormalizedPosition[] {
    const parsed = polymarketClosedPositionSchema.safeParse(item);
    if (!parsed.success) {
      return [];
    }
    const row = parsed.data;
    const conditionId = row.conditionId ?? row.condition_id ?? "";
    if (!conditionId) {
      return [];
    }
    const toStr = (value: unknown): string | null =>
      value === null || value === undefined ? null : new Decimal(value.toString()).toString();

    return [
      {
        walletAddress,
        conditionId,
        tokenId: row.asset === null || row.asset === undefined ? null : String(row.asset),
        outcome: row.outcome,
        size: "0", // closed: no open shares by definition
        avgPrice: toStr(row.avgPrice),
        curPrice: toStr(row.curPrice),
        initialValue: toStr(row.totalBought),
        currentValue: "0",
        cashPnl: toStr(row.realizedPnl),
        percentPnl: null,
        realizedPnl: toStr(row.realizedPnl),
        redeemable: null,
        mergeable: null,
        negativeRisk: null,
        marketTitle: row.title ?? null,
        marketSlug: row.slug ?? null,
        eventId: null,
        eventSlug: row.eventSlug ?? null,
        rawJson: item,
        metadata: {
          source: "data",
          fetchedAt,
          adapterVersion
        }
      } satisfies NormalizedPosition
    ];
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
