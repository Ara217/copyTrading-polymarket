import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletsService } from "./wallets.service";
import type { NormalizedMarket, NormalizedTrade } from "../polymarket/types";

describe("WalletsService", () => {
  const walletAddress = "0x1111111111111111111111111111111111111111";
  const fetchedAt = "2026-06-10T18:00:00.000Z";

  let tx: {
    wallet: { upsert: ReturnType<typeof vi.fn> };
    market: { upsert: ReturnType<typeof vi.fn> };
    trade: { deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
    position: { deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
    walletMetrics: { upsert: ReturnType<typeof vi.fn> };
    walletReadiness: { upsert: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    tx = {
      wallet: { upsert: vi.fn().mockResolvedValue(undefined) },
      market: { upsert: vi.fn().mockResolvedValue(undefined) },
      trade: {
        deleteMany: vi.fn().mockResolvedValue(undefined),
        createMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      position: {
        deleteMany: vi.fn().mockResolvedValue(undefined),
        createMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      walletMetrics: { upsert: vi.fn().mockResolvedValue(undefined) },
      walletReadiness: { upsert: vi.fn().mockResolvedValue(undefined) }
    };
  });

  it("calculates wallet counts from the deduped persisted trade set", async () => {
    const trade = normalizedTrade("trade-1");
    const prisma = {
      syncJob: { upsert: vi.fn().mockResolvedValue(undefined) },
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<void>) => callback(tx))
    };
    const polymarket = {
      getWalletTrades: vi.fn().mockResolvedValue([trade, { ...trade, id: "trade-duplicate" }]),
      getMarkets: vi.fn().mockResolvedValue([normalizedMarket()]),
      getPriceSnapshots: vi.fn().mockResolvedValue([])
    };
    const cache = { del: vi.fn().mockResolvedValue(undefined) };
    const service = new WalletsService(prisma as never, polymarket as never, cache as never);

    await service.refreshWallet(walletAddress);

    expect(polymarket.getMarkets).toHaveBeenCalledWith(["condition-1"]);
    expect(tx.trade.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ transactionHash: "0xabc", conditionId: "condition-1" })])
      })
    );
    expect(tx.trade.createMany.mock.calls[0][0].data).toHaveLength(1);
    expect(tx.walletMetrics.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ tradeCount: 1 }),
        update: expect.objectContaining({ tradeCount: 1 })
      })
    );
  });

  function normalizedTrade(id: string): NormalizedTrade {
    return {
      id,
      walletAddress,
      marketId: "condition-1",
      conditionId: "condition-1",
      outcome: "Yes",
      price: "0.5",
      size: "10",
      value: "5",
      side: "buy",
      timestamp: "2026-06-10T18:00:00.000Z",
      transactionHash: "0xabc",
      marketTitle: "Will the test pass?",
      marketSlug: "will-the-test-pass",
      rawJson: { id },
      metadata: {
        source: "data",
        fetchedAt,
        adapterVersion: "polymarket-v1"
      }
    };
  }

  function normalizedMarket(): NormalizedMarket {
    return {
      conditionId: "condition-1",
      slug: "will-the-test-pass",
      title: "Will the test pass?",
      category: "Testing",
      endDate: null,
      resolved: false,
      winningOutcome: null,
      lastKnownPrice: null,
      rawJson: {},
      metadata: {
        source: "gamma",
        fetchedAt,
        adapterVersion: "polymarket-v1"
      }
    };
  }
});
