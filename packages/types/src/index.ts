export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "paused"
  | "unknown";

export interface RefreshWalletResponse {
  jobId: string;
  status: JobStatus;
  walletAddress: string;
}

export interface WalletOverview {
  address: string;
  username: string | null;
  profileImage: string | null;
  totalPnl: string;
  volume: string;
  winrate: string;
  tradeCount: number;
  marketCount: number;
  lastActivity: string | null;
  lastSyncedAt: string | null;
  drawdown: string;
}

export interface TradeRow {
  id: string;
  timestamp: string;
  marketId: string;
  marketTitle: string | null;
  marketSlug: string | null;
  conditionId: string;
  outcome: string;
  price: string;
  size: string;
  value: string;
  transactionHash: string | null;
}

export interface PositionRow {
  id: string;
  marketId: string;
  marketTitle: string | null;
  marketSlug: string | null;
  outcome: string;
  currentShares: string;
  averageEntryPrice: string;
  averageExitPrice: string;
  realizedPnl: string;
  unrealizedPnl: string;
  totalPnl: string;
  confidenceScore: number;
}

export interface PnlChartPoint {
  date: string;
  dailyPnl: string;
  cumulativePnl: string;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
