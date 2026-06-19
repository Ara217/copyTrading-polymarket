import { Module } from "@nestjs/common";
import { RankingsController } from "./rankings.controller";
import { WalletsModule } from "../wallets/wallets.module";

@Module({
  imports: [WalletsModule],
  controllers: [RankingsController]
})
export class RankingsModule {}
