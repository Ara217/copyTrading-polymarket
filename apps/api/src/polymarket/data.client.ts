import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Decimal from "decimal.js";
import { adapterVersion, polymarketTradeSchema } from "@polyand/shared";
import { asArray, fetchJson } from "./http";
import { NormalizedTrade } from "./types";

@Injectable()
export class DataClient {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>("POLYMARKET_DATA_BASE_URL") ?? "https://data-api.polymarket.com";
  }

  async getWalletTrades(walletAddress: string): Promise<NormalizedTrade[]> {
    const url = new URL("/trades", this.baseUrl);
    url.searchParams.set("user", walletAddress);
    url.searchParams.set("limit", "1000");

    const raw = await fetchJson<unknown>(url.toString());
    const fetchedAt = new Date().toISOString();

    return asArray(raw).flatMap((item) => {
      const parsed = polymarketTradeSchema.safeParse(item);
      if (!parsed.success) {
        return [];
      }
      const trade = parsed.data;
      const conditionId = trade.conditionId ?? trade.condition_id ?? trade.market ?? trade.marketId ?? "";
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
    });
  }
}

