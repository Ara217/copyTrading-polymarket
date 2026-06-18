/* eslint-disable no-console */
import { PrismaClient, Prisma } from "@prisma/client";

const BATCH_SIZE = 500;

function extractAsset(rawJson: Prisma.JsonValue): string | null {
  if (!rawJson || typeof rawJson !== "object" || Array.isArray(rawJson)) {
    return null;
  }
  const record = rawJson as Record<string, unknown>;
  const candidate = record.asset ?? record.asset_id ?? record.tokenId ?? record.token_id;
  if (typeof candidate === "string" && candidate.length > 0) {
    return candidate;
  }
  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return String(candidate);
  }
  return null;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    let scanned = 0;
    let updated = 0;
    let skipped = 0;
    let cursor: string | undefined;

    while (true) {
      const batch = await prisma.trade.findMany({
        where: { tokenId: null },
        select: { id: true, rawJson: true },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {})
      });

      if (batch.length === 0) {
        break;
      }

      for (const trade of batch) {
        scanned += 1;
        const tokenId = extractAsset(trade.rawJson);
        if (!tokenId) {
          skipped += 1;
          continue;
        }
        await prisma.trade.update({ where: { id: trade.id }, data: { tokenId } });
        updated += 1;
      }

      cursor = batch[batch.length - 1].id;
      console.log(`progress: scanned=${scanned} updated=${updated} skipped=${skipped}`);
    }

    console.log(`done: scanned=${scanned} updated=${updated} skipped=${skipped}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
