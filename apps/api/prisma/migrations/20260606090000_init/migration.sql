-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "username" TEXT,
    "profileImage" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3),
    "rawJson" JSONB,
    "source" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "adapterVersion" TEXT,
    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "slug" TEXT,
    "title" TEXT,
    "category" TEXT,
    "endDate" TIMESTAMP(3),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "winningOutcome" TEXT,
    "lastKnownPrice" DECIMAL(18,8),
    "rawJson" JSONB,
    "source" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "adapterVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "price" DECIMAL(18,8) NOT NULL,
    "size" DECIMAL(18,8) NOT NULL,
    "value" DECIMAL(18,8) NOT NULL,
    "side" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "transactionHash" TEXT,
    "rawJson" JSONB,
    "source" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "adapterVersion" TEXT,
    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "currentShares" DECIMAL(18,8) NOT NULL,
    "averageEntryPrice" DECIMAL(18,8) NOT NULL,
    "averageExitPrice" DECIMAL(18,8) NOT NULL,
    "realizedPnl" DECIMAL(18,8) NOT NULL,
    "unrealizedPnl" DECIMAL(18,8) NOT NULL,
    "totalPnl" DECIMAL(18,8) NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletMetrics" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "totalPnl" DECIMAL(18,8) NOT NULL,
    "winrate" DECIMAL(18,8) NOT NULL,
    "volume" DECIMAL(18,8) NOT NULL,
    "drawdown" DECIMAL(18,8) NOT NULL,
    "tradeCount" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WalletMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopySimulation" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "settingsJson" JSONB NOT NULL,
    "resultJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CopySimulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_address_key" ON "Wallet"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Market_conditionId_key" ON "Market"("conditionId");

-- CreateIndex
CREATE INDEX "Market_slug_idx" ON "Market"("slug");

-- CreateIndex
CREATE INDEX "Market_resolved_idx" ON "Market"("resolved");

-- CreateIndex
CREATE INDEX "Trade_walletAddress_timestamp_idx" ON "Trade"("walletAddress", "timestamp");

-- CreateIndex
CREATE INDEX "Trade_conditionId_idx" ON "Trade"("conditionId");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_walletAddress_transactionHash_conditionId_outcome_tim_key" ON "Trade"("walletAddress", "transactionHash", "conditionId", "outcome", "timestamp");

-- CreateIndex
CREATE INDEX "Position_walletAddress_idx" ON "Position"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Position_walletAddress_marketId_outcome_key" ON "Position"("walletAddress", "marketId", "outcome");

-- CreateIndex
CREATE UNIQUE INDEX "WalletMetrics_walletAddress_key" ON "WalletMetrics"("walletAddress");

-- CreateIndex
CREATE INDEX "SyncJob_walletAddress_idx" ON "SyncJob"("walletAddress");

-- CreateIndex
CREATE INDEX "SyncJob_status_idx" ON "SyncJob"("status");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("conditionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("conditionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletMetrics" ADD CONSTRAINT "WalletMetrics_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopySimulation" ADD CONSTRAINT "CopySimulation_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

