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
  eventId: string | null;
  eventSlug: string | null;
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

export interface NormalizedPosition {
  walletAddress: string;
  conditionId: string;
  tokenId: string | null;
  outcome: string;
  size: string;
  avgPrice: string | null;
  curPrice: string | null;
  initialValue: string | null;
  currentValue: string | null;
  cashPnl: string | null;
  percentPnl: string | null;
  realizedPnl: string | null;
  redeemable: boolean | null;
  mergeable: boolean | null;
  negativeRisk: boolean | null;
  marketTitle: string | null;
  marketSlug: string | null;
  eventId: string | null;
  eventSlug: string | null;
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

