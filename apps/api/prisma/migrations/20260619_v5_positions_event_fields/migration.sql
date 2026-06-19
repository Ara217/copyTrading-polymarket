-- V5: /positions snapshot integration
-- Adds event grouping fields to Market and snapshot-derived fields to Position.
-- All fields are nullable so rows synced before V5 backfill stay valid.

ALTER TABLE "Market"
  ADD COLUMN "eventId" TEXT,
  ADD COLUMN "eventSlug" TEXT;

CREATE INDEX "Market_eventId_idx" ON "Market"("eventId");

ALTER TABLE "Position"
  ADD COLUMN "eventId" TEXT,
  ADD COLUMN "negativeRisk" BOOLEAN,
  ADD COLUMN "redeemable" BOOLEAN,
  ADD COLUMN "mergeable" BOOLEAN,
  ADD COLUMN "curPrice" DECIMAL(18, 8),
  ADD COLUMN "currentValue" DECIMAL(18, 8),
  ADD COLUMN "cashPnl" DECIMAL(18, 8),
  ADD COLUMN "percentPnl" DECIMAL(18, 8),
  ADD COLUMN "snapshotSource" TEXT,
  ADD COLUMN "snapshotAt" TIMESTAMP(3);

CREATE INDEX "Position_eventId_idx" ON "Position"("eventId");
