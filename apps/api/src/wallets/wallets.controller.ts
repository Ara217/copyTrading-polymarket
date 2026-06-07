import { BadRequestException, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { paginationQuerySchema, success } from "@polyand/shared";
import { WalletsService } from "./wallets.service";
import { WALLET_SYNC_QUEUE } from "./wallets.constants";

@Controller("wallets")
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    @InjectQueue(WALLET_SYNC_QUEUE) private readonly queue: Queue
  ) {}

  @Post(":address/refresh")
  async refresh(@Param("address") rawAddress: string) {
    const walletAddress = await this.resolveIdentifier(rawAddress);
    const job = await this.queue.add(
      "refresh-wallet",
      { walletAddress },
      {
        removeOnComplete: 100,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 }
      }
    );
    await this.walletsService.recordSyncJob(String(job.id), walletAddress, "waiting");

    return success({
      jobId: String(job.id),
      status: (await job.getState()) ?? "unknown",
      walletAddress
    });
  }

  @Get(":address/overview")
  async overview(@Param("address") rawAddress: string) {
    return success(await this.walletsService.getOverview(await this.resolveIdentifier(rawAddress)));
  }

  @Get(":address/trades")
  async trades(@Param("address") rawAddress: string, @Query() query: unknown) {
    const pagination = paginationQuerySchema.parse(query);
    const walletAddress = await this.resolveIdentifier(rawAddress);
    return success(
      await this.walletsService.getTrades(walletAddress, pagination.limit, pagination.offset),
      pagination
    );
  }

  @Get(":address/positions")
  async positions(@Param("address") rawAddress: string) {
    return success(await this.walletsService.getPositions(await this.resolveIdentifier(rawAddress)));
  }

  @Get(":address/pnl-chart")
  async pnlChart(@Param("address") rawAddress: string) {
    return success(await this.walletsService.getPnlChart(await this.resolveIdentifier(rawAddress)));
  }

  private async resolveIdentifier(identifier: string): Promise<string> {
    try {
      return await this.walletsService.resolveWalletIdentifier(identifier);
    } catch {
      throw new BadRequestException("Invalid wallet address or Polymarket profile slug");
    }
  }
}
