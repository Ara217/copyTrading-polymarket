CREATE TABLE "WalletReadiness" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "readinessScore" INTEGER NOT NULL,
    "dataCoverageScore" INTEGER NOT NULL,
    "freshnessScore" INTEGER NOT NULL,
    "activityScore" INTEGER NOT NULL,
    "liquidityScore" INTEGER NOT NULL,
    "positionSizeScore" INTEGER NOT NULL,
    "activityCadenceJson" JSONB NOT NULL,
    "categoryExposureJson" JSONB NOT NULL,
    "oversizedTradesJson" JSONB NOT NULL,
    "oversizedTradeSummaryJson" JSONB NOT NULL,
    "warningsJson" JSONB NOT NULL,
    "configJson" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletReadiness_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletReadiness_walletAddress_key" ON "WalletReadiness"("walletAddress");

ALTER TABLE "WalletReadiness" ADD CONSTRAINT "WalletReadiness_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
