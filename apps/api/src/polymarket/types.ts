export interface RawMetadata {
  source: "gamma" | "data" | "clob";
  fetchedAt: string;
  adapterVersion: string;
}

export interface NormalizedMarket {
  conditionId: string;
  slug: string | null;
  title: string | null;
  category: string | null;
  endDate: string | null;
  resolved: boolean;
  winningOutcome: string | null;
  lastKnownPrice: string | null;
  rawJson: unknown;
  metadata: RawMetadata;
}

export interface NormalizedTrade {
  id: string;
  walletAddress: string;
  marketId: string;
  conditionId: string;
  tokenId: string | null;
  outcome: string;
  price: string;
  size: string;
  value: string;
  side: string | null;
  timestamp: string;
  transactionHash: string | null;
  marketTitle: string | null;
  marketSlug: string | null;
  rawJson: unknown;
  metadata: RawMetadata;
}

export interface MarketPriceSnapshot {
  marketId: string;
  outcome: string;
  price: string;
  resolved?: boolean;
  winningOutcome?: string | null;
  markedToMarket?: boolean;
}

