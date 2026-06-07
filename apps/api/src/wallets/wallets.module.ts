import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { WalletsController } from "./wallets.controller";
import { WalletsService } from "./wallets.service";
import { WalletSyncProcessor } from "./wallet-sync.processor";
import { PolymarketModule } from "../polymarket/polymarket.module";
import { WALLET_SYNC_QUEUE } from "./wallets.constants";

@Module({
  imports: [BullModule.registerQueue({ name: WALLET_SYNC_QUEUE }), PolymarketModule],
  controllers: [WalletsController],
  providers: [WalletsService, WalletSyncProcessor],
  exports: [WalletsService]
})
export class WalletsModule {}
