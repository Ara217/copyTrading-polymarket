import { Module } from "@nestjs/common";
import { GammaClient } from "./gamma.client";
import { DataClient } from "./data.client";
import { ClobClient } from "./clob.client";
import { PolymarketService } from "./polymarket.service";

@Module({
  providers: [GammaClient, DataClient, ClobClient, PolymarketService],
  exports: [PolymarketService]
})
export class PolymarketModule {}

