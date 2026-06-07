import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Decimal from "decimal.js";
import { MarketPriceSnapshot } from "./types";

interface OrderBookResponse {
  bids?: Array<{ price: string; size: string }>;
  asks?: Array<{ price: string; size: string }>;
}

@Injectable()
export class ClobClient {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>("POLYMARKET_CLOB_BASE_URL") ?? "https://clob.polymarket.com";
  }

  async getMidpointPrice(marketId: string, outcome: string): Promise<MarketPriceSnapshot | null> {
    try {
      const url = new URL("/book", this.baseUrl);
      url.searchParams.set("token_id", marketId);
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (!response.ok) {
        return null;
      }
      const orderBook = (await response.json()) as OrderBookResponse;
      const bestBid = this.bestBid(orderBook.bids ?? []);
      const bestAsk = this.bestAsk(orderBook.asks ?? []);

      if (bestBid && bestAsk) {
        return {
          marketId,
          outcome,
          price: bestBid.plus(bestAsk).div(2).toString()
        };
      }
      if (bestBid) {
        return { marketId, outcome, price: bestBid.toString() };
      }
      if (bestAsk) {
        return { marketId, outcome, price: bestAsk.toString() };
      }
      return null;
    } catch {
      return null;
    }
  }

  private bestBid(bids: Array<{ price: string }>): Decimal | null {
    return bids.reduce<Decimal | null>((best, bid) => {
      const price = new Decimal(bid.price);
      return best ? Decimal.max(best, price) : price;
    }, null);
  }

  private bestAsk(asks: Array<{ price: string }>): Decimal | null {
    return asks.reduce<Decimal | null>((best, ask) => {
      const price = new Decimal(ask.price);
      return best ? Decimal.min(best, price) : price;
    }, null);
  }
}

