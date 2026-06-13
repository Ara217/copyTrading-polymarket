import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { WalletsController } from "./wallets.controller";

describe("WalletsController", () => {
  it("rejects invalid wallet addresses before enqueueing refresh jobs", async () => {
    const queue = { add: vi.fn() };
    const service = {
      recordSyncJob: vi.fn(),
      resolveWalletIdentifier: vi.fn().mockRejectedValue(new Error("invalid"))
    };
    const controller = new WalletsController(service as never, queue as never);

    await expect(controller.refresh("invalid")).rejects.toBeInstanceOf(BadRequestException);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it("returns V2 performance analytics in the standard response envelope", async () => {
    const queue = { add: vi.fn() };
    const service = {
      resolveWalletIdentifier: vi.fn().mockResolvedValue("0x1111111111111111111111111111111111111111"),
      getPerformance: vi.fn().mockResolvedValue({
        realizedPnl: "12",
        unrealizedPnl: "3",
        totalPnl: "15",
        roi: "0.25",
        tradeWinrate: "0.5",
        marketWinrate: "0.6",
        resolvedMarketWinrate: "0.5",
        maxDrawdown: "4",
        currentDrawdown: "1",
        averageDrawdown: "2",
        longestWinStreak: 3,
        longestLossStreak: 1,
        bestTrade: null,
        worstTrade: null
      })
    };
    const controller = new WalletsController(service as never, queue as never);

    await expect(controller.performance("0x1111111111111111111111111111111111111111")).resolves.toEqual({
      data: {
        realizedPnl: "12",
        unrealizedPnl: "3",
        totalPnl: "15",
        roi: "0.25",
        tradeWinrate: "0.5",
        marketWinrate: "0.6",
        resolvedMarketWinrate: "0.5",
        maxDrawdown: "4",
        currentDrawdown: "1",
        averageDrawdown: "2",
        longestWinStreak: 3,
        longestLossStreak: 1,
        bestTrade: null,
        worstTrade: null
      }
    });
  });

  it("returns V3 copy-readiness analytics with parsed copy settings", async () => {
    const queue = { add: vi.fn() };
    const walletAddress = "0x1111111111111111111111111111111111111111";
    const service = {
      resolveWalletIdentifier: vi.fn().mockResolvedValue(walletAddress),
      getCopyReadiness: vi.fn().mockResolvedValue({
        readinessScore: 72,
        dataCoverageScore: 40,
        freshnessScore: 100,
        activityScore: 60,
        liquidityScore: 80,
        positionSizeScore: 75,
        activityCadence: {
          activeDays: 8,
          observedDays: 20,
          tradesPerActiveDay: "3",
          daysSinceLastTrade: 1
        },
        categoryExposure: [],
        oversizedTrades: [],
        oversizedTradeSummary: {
          count: 0,
          roi: "0",
          winrate: "0",
          largestWin: "0",
          largestLoss: "0"
        },
        warnings: [],
        config: {
          copyBalance: "500",
          maxPositionSize: "50",
          minPositionSize: "5",
          oversizedThreshold: "100",
          topPercent: 0.1,
          relativeMultiplier: "2"
        },
        updatedAt: null
      })
    };
    const controller = new WalletsController(service as never, queue as never);

    await expect(
      controller.copyReadiness(walletAddress, {
        copyBalance: "500",
        maxPositionSize: "50",
        oversizedThreshold: "100",
        topPercent: "0.1",
        relativeMultiplier: "2"
      })
    ).resolves.toEqual({
      data: expect.objectContaining({
        readinessScore: 72,
        freshnessScore: 100
      })
    });
    expect(service.getCopyReadiness).toHaveBeenCalledWith(
      walletAddress,
      expect.objectContaining({
        copyBalance: "500",
        maxPositionSize: "50",
        oversizedThreshold: "100",
        topPercent: 0.1,
        relativeMultiplier: "2"
      })
    );
  });

  it("validates copy simulation settings before running a simulation", async () => {
    const queue = { add: vi.fn() };
    const walletAddress = "0x1111111111111111111111111111111111111111";
    const service = {
      resolveWalletIdentifier: vi.fn().mockResolvedValue(walletAddress),
      runCopySimulation: vi.fn()
    };
    const controller = new WalletsController(service as never, queue as never);

    await expect(
      controller.createCopySimulation(walletAddress, { startingBalance: 0 })
    ).rejects.toThrow();
    expect(service.runCopySimulation).not.toHaveBeenCalled();
  });

  it("runs a copy simulation with parsed settings and returns the persisted record", async () => {
    const queue = { add: vi.fn() };
    const walletAddress = "0x1111111111111111111111111111111111111111";
    const record = {
      id: "sim-1",
      walletAddress,
      createdAt: "2026-06-12T00:00:00.000Z",
      settings: expect.anything(),
      result: expect.anything()
    };
    const service = {
      resolveWalletIdentifier: vi.fn().mockResolvedValue(walletAddress),
      runCopySimulation: vi.fn().mockResolvedValue(record)
    };
    const controller = new WalletsController(service as never, queue as never);

    await expect(
      controller.createCopySimulation(walletAddress, { copyPercentage: 0.25, delaySeconds: "300" })
    ).resolves.toEqual({ data: record });
    expect(service.runCopySimulation).toHaveBeenCalledWith(
      walletAddress,
      expect.objectContaining({
        startingBalance: "1000",
        copyPercentage: "0.25",
        delaySeconds: 300,
        allowedActions: ["entry", "add", "reduce", "close"]
      })
    );
  });

  it("returns the per-wallet copy sizing suggestion", async () => {
    const queue = { add: vi.fn() };
    const walletAddress = "0x1111111111111111111111111111111111111111";
    const suggestion = {
      tradeCount: 4,
      medianTradeValue: "20",
      p25TradeValue: "10",
      p75TradeValue: "30",
      recommendedCopyPercentage: "0.1",
      recommendedMinPositionSize: "1"
    };
    const service = {
      resolveWalletIdentifier: vi.fn().mockResolvedValue(walletAddress),
      getCopySizingSuggestion: vi.fn().mockResolvedValue(suggestion)
    };
    const controller = new WalletsController(service as never, queue as never);

    await expect(controller.copySizingSuggestion(walletAddress)).resolves.toEqual({ data: suggestion });
    expect(service.getCopySizingSuggestion).toHaveBeenCalledWith(walletAddress);
  });

  it("lists copy simulations and fetches a simulation by id", async () => {
    const queue = { add: vi.fn() };
    const walletAddress = "0x1111111111111111111111111111111111111111";
    const listItem = { id: "sim-1", walletAddress, createdAt: "2026-06-12T00:00:00.000Z" };
    const service = {
      resolveWalletIdentifier: vi.fn().mockResolvedValue(walletAddress),
      listCopySimulations: vi.fn().mockResolvedValue([listItem]),
      getCopySimulation: vi.fn().mockResolvedValue(listItem)
    };
    const controller = new WalletsController(service as never, queue as never);

    await expect(controller.listCopySimulations(walletAddress)).resolves.toEqual({ data: [listItem] });
    await expect(controller.getCopySimulation(walletAddress, "sim-1")).resolves.toEqual({ data: listItem });
    expect(service.getCopySimulation).toHaveBeenCalledWith(walletAddress, "sim-1");
  });
});
