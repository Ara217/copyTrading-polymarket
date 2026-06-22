import { describe, expect, it } from "vitest";
import type { ReconstructedPosition } from "@polyand/analytics";
import { mergeReconstructionWithSnapshot } from "./positions-snapshot";
import type { MarketPriceSnapshot, NormalizedMarket, NormalizedPosition } from "../polymarket/types";

const baseMetadata = { source: "data" as const, fetchedAt: "2026-06-19T00:00:00.000Z", adapterVersion: "polymarket-v1" };

function reconstruction(overrides: Partial<ReconstructedPosition>): ReconstructedPosition {
  return {
    marketId: "0xcond",
    conditionId: "0xcond",
    outcome: "Yes",
    currentShares: "10",
    averageEntryPrice: "0.5",
    averageExitPrice: "0",
    realizedPnl: "0",
    unrealizedPnl: "0",
    totalPnl: "0",
    confidenceScore: 100,
    ...overrides
  };
}

function snapshotRow(overrides: Partial<NormalizedPosition> = {}): NormalizedPosition {
  return {
    walletAddress: "0xwallet",
    conditionId: "0xcond",
    tokenId: "tok-1",
    outcome: "Yes",
    size: "10",
    avgPrice: "0.5",
    curPrice: "0.55",
    initialValue: "5",
    currentValue: "5.5",
    cashPnl: "0.5",
    percentPnl: "0.1",
    realizedPnl: "0",
    redeemable: false,
    mergeable: false,
    negativeRisk: false,
    marketTitle: null,
    marketSlug: null,
    eventId: "ev-1",
    eventSlug: "world-cup",
    rawJson: {},
    metadata: baseMetadata,
    ...overrides
  };
}

function market(overrides: Partial<NormalizedMarket> = {}): NormalizedMarket {
  return {
    conditionId: "0xcond",
    slug: null,
    title: null,
    category: null,
    endDate: null,
    resolved: false,
    winningOutcome: null,
    lastKnownPrice: null,
    eventId: null,
    eventSlug: null,
    rawJson: {},
    metadata: { source: "gamma", fetchedAt: baseMetadata.fetchedAt, adapterVersion: "polymarket-v1" },
    ...overrides
  };
}

const snapshotAt = new Date("2026-06-19T12:00:00.000Z");

describe("mergeReconstructionWithSnapshot", () => {
  it("credits redemption when upstream position is missing for a held condition", () => {
    const result = mergeReconstructionWithSnapshot({
      walletAddress: "0xwallet",
      reconstructed: [reconstruction({ currentShares: "10", averageEntryPrice: "0.4", realizedPnl: "0" })],
      snapshot: [],
      markets: [market()],
      priceSnapshots: [
        { marketId: "0xcond", outcome: "Yes", price: "1", resolved: true, winningOutcome: "Yes" }
      ] satisfies MarketPriceSnapshot[],
      snapshotAt
    });
    expect(result.redemptionsCredited).toBe(1);
    expect(result.positions).toHaveLength(1);
    const pos = result.positions[0];
    expect(pos.currentShares).toBe("0");
    // cost basis 10*0.4=4; settlement Yes (winner) → 1*10=10; realizedPnl = 10-4 = 6
    expect(pos.realizedPnl).toBe("6");
    expect(pos.totalPnl).toBe("6");
    expect(pos.snapshotSource).toBe("snapshot-redemption");
  });

  it("zeros out and uses upstream realizedPnl when present on a redeemed row", () => {
    const result = mergeReconstructionWithSnapshot({
      walletAddress: "0xwallet",
      reconstructed: [reconstruction({ currentShares: "10", averageEntryPrice: "0.4" })],
      snapshot: [snapshotRow({ size: "0", realizedPnl: "-11.75", curPrice: "0" })],
      markets: [market()],
      priceSnapshots: [],
      snapshotAt
    });
    const pos = result.positions[0];
    expect(pos.currentShares).toBe("0");
    expect(pos.realizedPnl).toBe("-11.75");
    expect(pos.snapshotSource).toBe("snapshot-redemption");
  });

  it("uses upstream values when reconstruction diverges beyond tolerance", () => {
    const result = mergeReconstructionWithSnapshot({
      walletAddress: "0xwallet",
      reconstructed: [reconstruction({ currentShares: "8", averageEntryPrice: "0.5", realizedPnl: "0", unrealizedPnl: "0", totalPnl: "0" })],
      snapshot: [snapshotRow({ size: "10", avgPrice: "0.5", curPrice: "0.6", realizedPnl: "0" })],
      markets: [market()],
      priceSnapshots: [],
      snapshotAt
    });
    expect(result.divergences).toBe(1);
    const pos = result.positions[0];
    expect(pos.currentShares).toBe("10");
    // (0.6 - 0.5) * 10 = 1
    expect(pos.unrealizedPnl).toBe("1");
    expect(pos.snapshotSource).toBe("snapshot");
  });

  it("keeps reconstruction when within tolerance and still attaches snapshot fields", () => {
    const result = mergeReconstructionWithSnapshot({
      walletAddress: "0xwallet",
      reconstructed: [reconstruction({ currentShares: "10", averageEntryPrice: "0.5", unrealizedPnl: "0.5", totalPnl: "0.5" })],
      snapshot: [snapshotRow()],
      markets: [market()],
      priceSnapshots: [],
      snapshotAt
    });
    expect(result.divergences).toBe(0);
    expect(result.positions[0].currentShares).toBe("10");
    expect(result.positions[0].curPrice).toBe("0.55");
    expect(result.positions[0].eventId).toBe("ev-1");
    expect(result.positions[0].snapshotSource).toBe("snapshot");
  });

  it("inserts snapshot-only positions not present in reconstruction (pre-window holdings)", () => {
    const result = mergeReconstructionWithSnapshot({
      walletAddress: "0xwallet",
      reconstructed: [],
      snapshot: [snapshotRow({ conditionId: "0xother", size: "7", avgPrice: "0.3", curPrice: "0.4" })],
      markets: [],
      priceSnapshots: [],
      snapshotAt
    });
    expect(result.positions).toHaveLength(1);
    expect(result.positions[0].conditionId).toBe("0xother");
    expect(result.positions[0].currentShares).toBe("7");
    expect(result.positions[0].unrealizedPnl).toBe("0.7");
  });

  it("synthesizes a market for every snapshot-only position so the FK never breaks", () => {
    const result = mergeReconstructionWithSnapshot({
      walletAddress: "0xwallet",
      reconstructed: [],
      snapshot: [snapshotRow({ conditionId: "0xother", size: "7", avgPrice: "0.3", curPrice: "0.4" })],
      markets: [],
      priceSnapshots: [],
      snapshotAt
    });
    const marketConditionIds = new Set(result.markets.map((m) => m.conditionId));
    for (const position of result.positions) {
      expect(marketConditionIds.has(position.marketId)).toBe(true);
    }
    expect(marketConditionIds.has("0xother")).toBe(true);
  });

  it("back-merges eventId/eventSlug from snapshot into markets", () => {
    const result = mergeReconstructionWithSnapshot({
      walletAddress: "0xwallet",
      reconstructed: [reconstruction({ currentShares: "10" })],
      snapshot: [snapshotRow()],
      markets: [market({ eventId: null, eventSlug: null })],
      priceSnapshots: [],
      snapshotAt
    });
    expect(result.markets[0].eventId).toBe("ev-1");
    expect(result.markets[0].eventSlug).toBe("world-cup");
  });
});
