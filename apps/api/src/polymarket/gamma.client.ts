import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { adapterVersion, polymarketMarketSchema } from "@polyand/shared";
import { asArray, fetchJson } from "./http";
import { NormalizedMarket } from "./types";

const CONDITION_ID_BATCH_SIZE = 50;

@Injectable()
export class GammaClient {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>("POLYMARKET_GAMMA_BASE_URL") ?? "https://gamma-api.polymarket.com";
  }

  async getMarketsByConditionIds(conditionIds: string[]): Promise<NormalizedMarket[]> {
    const uniqueIds = [...new Set(conditionIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }

    const fetchedAt = new Date().toISOString();
    const markets = (
      await Promise.all(
        this.chunkConditionIds(uniqueIds).map((conditionIdBatch) =>
          this.fetchMarketsBatch(conditionIdBatch, fetchedAt)
        )
      )
    ).flat();

    const found = new Set(markets.map((market) => market.conditionId));
    const fallbackMarkets = uniqueIds
      .filter((conditionId) => !found.has(conditionId))
      .map(
        (conditionId) =>
          ({
            conditionId,
            slug: null,
            title: null,
            category: null,
            endDate: null,
            resolved: false,
            winningOutcome: null,
            lastKnownPrice: null,
            eventId: null,
            eventSlug: null,
            rawJson: { conditionId },
            metadata: {
              source: "gamma",
              fetchedAt,
              adapterVersion
            }
          }) satisfies NormalizedMarket
      );

    return [...markets, ...fallbackMarkets];
  }

  private async fetchMarketsBatch(conditionIds: string[], fetchedAt: string): Promise<NormalizedMarket[]> {
    const url = new URL("/markets", this.baseUrl);
    url.searchParams.set("condition_ids", conditionIds.join(","));
    url.searchParams.set("limit", String(Math.min(conditionIds.length, 500)));

    const raw = await fetchJson<unknown>(url.toString());
    return asArray(raw).flatMap((item) => {
      const parsed = polymarketMarketSchema.safeParse(item);
      if (!parsed.success) {
        return [];
      }
      const market = parsed.data;
      const conditionId = market.conditionId ?? market.condition_id ?? "";
      if (!conditionId) {
        return [];
      }

      // Pull event grouping out of gamma when present; /positions snapshot back-fills any gaps later.
      const rawObj = (item ?? {}) as Record<string, unknown>;
      const eventId = this.pickEventId(rawObj);
      const eventSlug = this.pickEventSlug(rawObj);
      return [
        {
          conditionId,
          slug: market.slug ?? null,
          title: market.title ?? market.question ?? null,
          category: market.category ?? null,
          endDate: market.endDate ?? market.end_date ?? null,
          resolved: Boolean(market.resolved ?? market.closed ?? false),
          winningOutcome: market.winningOutcome ?? market.winning_outcome ?? null,
          lastKnownPrice: null,
          eventId,
          eventSlug,
          rawJson: item,
          metadata: {
            source: "gamma",
            fetchedAt,
            adapterVersion
          }
        } satisfies NormalizedMarket
      ];
    });
  }

  private chunkConditionIds(conditionIds: string[]): string[][] {
    const batches: string[][] = [];
    for (let index = 0; index < conditionIds.length; index += CONDITION_ID_BATCH_SIZE) {
      batches.push(conditionIds.slice(index, index + CONDITION_ID_BATCH_SIZE));
    }
    return batches;
  }

  private pickEventId(raw: Record<string, unknown>): string | null {
    const direct = raw["eventId"] ?? raw["event_id"];
    if (typeof direct === "string" && direct.length > 0) return direct;
    if (typeof direct === "number") return String(direct);
    const event = raw["event"];
    if (event && typeof event === "object" && !Array.isArray(event)) {
      const nested = (event as Record<string, unknown>)["id"];
      if (typeof nested === "string" && nested.length > 0) return nested;
      if (typeof nested === "number") return String(nested);
    }
    return null;
  }

  private pickEventSlug(raw: Record<string, unknown>): string | null {
    const direct = raw["eventSlug"] ?? raw["event_slug"];
    if (typeof direct === "string" && direct.length > 0) return direct;
    const event = raw["event"];
    if (event && typeof event === "object" && !Array.isArray(event)) {
      const slug = (event as Record<string, unknown>)["slug"];
      if (typeof slug === "string" && slug.length > 0) return slug;
    }
    return null;
  }
}
