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
  side: "buy" | "sell";
  positionEffect: "entry" | "add" | "reduce" | "close";
  realizedPnl: string;
  result: "open" | "win" | "loss" | "flat";
  remainingShares: string;
  marketResolved: boolean;
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
  lastTradeAt: string | null;
}

export interface PnlChartPoint {
  date: string;
  dailyPnl: string;
  cumulativePnl: string;
}

export interface TradeHighlight {
  tradeId: string;
  marketId: string;
  conditionId: string;
  outcome: string;
  timestamp: string;
  pnl: string;
  price: string;
  size: string;
  marketTitle?: string | null;
}

export interface ProfitDistributionBucket {
  bucket: string;
  count: number;
}

export interface WinLossChartPoint {
  date: string;
  wins: number;
  losses: number;
}

export interface DrawdownChartPoint {
  date: string;
  cumulativePnl: string;
  drawdown: string;
}

export interface WalletPerformance {
  realizedPnl: string;
  unrealizedPnl: string;
  totalPnl: string;
  roi: string;
  tradeWinrate: string;
  marketWinrate: string;
  resolvedMarketWinrate: string;
  maxDrawdown: string;
  currentDrawdown: string;
  averageDrawdown: string;
  longestWinStreak: number;
  longestLossStreak: number;
  bestTrade: TradeHighlight | null;
  worstTrade: TradeHighlight | null;
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
