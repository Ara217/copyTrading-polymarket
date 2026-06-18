-- Adds ERC1155 token id captured from Polymarket Data API trade payloads.
-- Required so CLOB /book lookups for live mark-to-market prices receive a
-- valid token_id (the numeric `asset`) instead of the conditionId.
ALTER TABLE "Trade" ADD COLUMN "tokenId" TEXT;

CREATE INDEX "Trade_tokenId_idx" ON "Trade"("tokenId");
