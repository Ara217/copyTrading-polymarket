import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { WalletsModule } from "./wallets/wallets.module";
import { PolymarketModule } from "./polymarket/polymarket.module";
import { CacheModule } from "./cache/cache.module";
import { RankingsModule } from "./rankings/rankings.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>("REDIS_URL") ?? "redis://localhost:6379",
          maxRetriesPerRequest: null
        }
      })
    }),
    PrismaModule,
    CacheModule,
    PolymarketModule,
    WalletsModule,
    RankingsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}

