import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { WalletsService } from "./wallets.service";
import { WALLET_SYNC_QUEUE } from "./wallets.constants";

interface WalletSyncJob {
  walletAddress: string;
}

@Processor(WALLET_SYNC_QUEUE, { concurrency: 2 })
export class WalletSyncProcessor extends WorkerHost {
  constructor(private readonly walletsService: WalletsService) {
    super();
  }

  async process(job: Job<WalletSyncJob>): Promise<void> {
    await this.walletsService.recordSyncJob(String(job.id), job.data.walletAddress, "active");
    try {
      await this.walletsService.refreshWallet(job.data.walletAddress);
      await this.walletsService.recordSyncJob(String(job.id), job.data.walletAddress, "completed");
    } catch (error) {
      await this.walletsService.recordSyncJob(String(job.id), job.data.walletAddress, "failed");
      await this.walletsService.recordSyncJob(`wallet:${job.data.walletAddress}:latest`, job.data.walletAddress, "failed");
      throw error;
    }
  }
}
