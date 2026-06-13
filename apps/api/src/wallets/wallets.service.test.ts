import { NotFoundException } from "@nestjs/common";
import { copySimulationSettingsSchema } from "@polyand/shared";
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

  it("runs a copy simulation from persisted trades and stores the result", async () => {
    const market = {
      title: "Will the test pass?",
      slug: "will-the-test-pass",
      category: "Crypto",
      rawJson: {},
      resolved: false,
      winningOutcome: null
    };
    const tradeRows = [
      {
        id: "trade-1",
        marketId: "condition-1",
        conditionId: "condition-1",
        outcome: "Yes",
        price: "0.40",
        size: "100",
        side: "buy",
        timestamp: new Date("2025-01-01T00:00:00.000Z"),
        market
      },
      {
        id: "trade-2",
        marketId: "condition-1",
        conditionId: "condition-1",
        outcome: "Yes",
        price: "0.70",
        size: "40",
        side: "sell",
        timestamp: new Date("2025-01-02T00:00:00.000Z"),
        market
      },
      {
        id: "trade-3",
        marketId: "condition-1",
        conditionId: "condition-1",
        outcome: "Yes",
        price: "0.80",
        size: "60",
        side: "sell",
        timestamp: new Date("2025-01-03T00:00:00.000Z"),
        market
      }
    ];
    const prisma = {
      trade: { findMany: vi.fn().mockResolvedValue(tradeRows) },
      copySimulation: {
        create: vi.fn().mockResolvedValue({ id: "sim-1", createdAt: new Date("2026-06-12T00:00:00.000Z") })
      }
    };
    const service = new WalletsService(prisma as never, {} as never, {} as never);
    const settings = copySimulationSettingsSchema.parse({ copyPercentage: 0.5, minPositionSize: 1 });

    const record = await service.runCopySimulation(walletAddress, settings);

    expect(record.id).toBe("sim-1");
    expect(record.walletAddress).toBe(walletAddress);
    expect(record.result.summary.realizedPnl).toBe("18");
    expect(record.result.summary.copiedTradeCount).toBe(3);
    expect(record.result.summary.roi).toBe("0.018");
    expect(record.result.delaySensitivity.length).toBeGreaterThan(1);
    expect(record.result.ledger[0]?.marketTitle).toBe("Will the test pass?");
    expect(record.result.categoryBreakdown[0]?.category).toBe("Crypto");
    expect(prisma.copySimulation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          walletAddress,
          settingsJson: expect.objectContaining({ copyPercentage: "0.5" }),
          resultJson: expect.objectContaining({
            summary: expect.objectContaining({ realizedPnl: "18" })
          })
        })
      })
    );
  });

  it("rejects simulations for wallets with no synced trades", async () => {
    const prisma = {
      trade: { findMany: vi.fn().mockResolvedValue([]) },
      copySimulation: { create: vi.fn() }
    };
    const service = new WalletsService(prisma as never, {} as never, {} as never);
    const settings = copySimulationSettingsSchema.parse({});

    await expect(service.runCopySimulation(walletAddress, settings)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.copySimulation.create).not.toHaveBeenCalled();
  });

  it("lists stored simulations and throws when a simulation id is unknown", async () => {
    const stored = {
      id: "sim-1",
      walletAddress,
      createdAt: new Date("2026-06-12T00:00:00.000Z"),
      settingsJson: { startingBalance: "1000" },
      resultJson: { summary: { roi: "0.018" } }
    };
    const prisma = {
      copySimulation: {
        findMany: vi.fn().mockResolvedValue([stored]),
        findFirst: vi.fn().mockResolvedValue(null)
      }
    };
    const service = new WalletsService(prisma as never, {} as never, {} as never);

    await expect(service.listCopySimulations(walletAddress)).resolves.toEqual([
      {
        id: "sim-1",
        walletAddress,
        createdAt: "2026-06-12T00:00:00.000Z",
        settings: { startingBalance: "1000" },
        summary: { roi: "0.018" }
      }
    ]);
    await expect(service.getCopySimulation(walletAddress, "missing")).rejects.toBeInstanceOf(NotFoundException);
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
