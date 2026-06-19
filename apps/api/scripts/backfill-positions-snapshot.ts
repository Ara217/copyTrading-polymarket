/* eslint-disable no-console */
// One-shot script: re-runs refreshWallet for every persisted wallet so the V5
// /positions snapshot cross-check populates the new fields. Safe to re-run.
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { WalletsService } from "../src/wallets/wallets.service";
import { PrismaService } from "../src/prisma/prisma.service";

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ["error", "warn", "log"] });
  const logger = new Logger("backfill-positions-snapshot");
  const prisma = app.get(PrismaService);
  const wallets = app.get(WalletsService);

  const rows = await prisma.wallet.findMany({ select: { address: true } });
  logger.log(`refreshing ${rows.length} wallet(s)`);

  let ok = 0;
  let fail = 0;
  for (const { address } of rows) {
    try {
      await wallets.refreshWallet(address);
      ok += 1;
      logger.log(`ok ${address}`);
    } catch (error) {
      fail += 1;
      logger.error(`fail ${address} ${(error as Error).message}`);
    }
  }
  logger.log(`done ok=${ok} fail=${fail}`);
  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
