-- V5.2 ranking overhaul: add realized-ROI component and make component scores nullable
-- so a missing signal renders as "n/a" instead of a misleading 0.

ALTER TABLE "WalletRanking" ADD COLUMN "realizedRoiScore" INTEGER;

ALTER TABLE "WalletRanking" ALTER COLUMN "simulatedRoiScore" DROP NOT NULL;
ALTER TABLE "WalletRanking" ALTER COLUMN "drawdownScore" DROP NOT NULL;
ALTER TABLE "WalletRanking" ALTER COLUMN "consistencyScore" DROP NOT NULL;
ALTER TABLE "WalletRanking" ALTER COLUMN "recentPerformanceScore" DROP NOT NULL;
ALTER TABLE "WalletRanking" ALTER COLUMN "liquidityScore" DROP NOT NULL;
ALTER TABLE "WalletRanking" ALTER COLUMN "delayToleranceScore" DROP NOT NULL;
ALTER TABLE "WalletRanking" ALTER COLUMN "activityScore" DROP NOT NULL;
ALTER TABLE "WalletRanking" ALTER COLUMN "categoryFocusScore" DROP NOT NULL;
ALTER TABLE "WalletRanking" ALTER COLUMN "oversizedRiskScore" DROP NOT NULL;
