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
});
