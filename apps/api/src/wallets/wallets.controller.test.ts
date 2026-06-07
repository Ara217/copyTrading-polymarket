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
});
