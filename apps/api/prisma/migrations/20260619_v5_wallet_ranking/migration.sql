-- V5: Wallet copyability ranking persistence
CREATE TABLE "WalletRanking" (
  "id" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "simulatedRoiScore" INTEGER NOT NULL,
  "drawdownScore" INTEGER NOT NULL,
  "consistencyScore" INTEGER NOT NULL,
  "recentPerformanceScore" INTEGER NOT NULL,
  "liquidityScore" INTEGER NOT NULL,
  "delayToleranceScore" INTEGER NOT NULL,
  "activityScore" INTEGER NOT NULL,
  "categoryFocusScore" INTEGER NOT NULL,
  "dataConfidenceScore" INTEGER NOT NULL,
  "oversizedRiskScore" INTEGER NOT NULL,
  "finalScore" INTEGER NOT NULL,
  "classification" TEXT NOT NULL,
  "warningsJson" JSONB NOT NULL,
  "weightsVersion" TEXT NOT NULL,
  "inputProfileJson" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WalletRanking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletRanking_walletAddress_key" ON "WalletRanking"("walletAddress");
CREATE INDEX "WalletRanking_finalScore_idx" ON "WalletRanking"("finalScore");

ALTER TABLE "WalletRanking"
  ADD CONSTRAINT "WalletRanking_walletAddress_fkey"
  FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
