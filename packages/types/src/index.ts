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
  totalBet: string;
  totalReturned: string;
  currentValue: string;
  realizedPnl: string;
  unrealizedPnl: string;
  totalPnl: string;
  confidenceScore: number;
  lastTradeAt: string | null;
  marketResolved: boolean;
  winningOutcome: string | null;
  eventId: string | null;
  eventSlug: string | null;
  negativeRisk: boolean | null;
  redeemable: boolean | null;
  mergeable: boolean | null;
  curPrice: string | null;
  snapshotSource: "snapshot" | "reconstruction" | "snapshot-redemption" | null;
  snapshotAt: string | null;
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

export interface CopyReadinessConfig {
  copyBalance: string;
  maxPositionSize: string;
  minPositionSize: string;
  oversizedThreshold: string;
  topPercent: number;
  relativeMultiplier: string;
}

export interface ReadinessWarning {
  code: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface ActivityCadence {
  activeDays: number;
  observedDays: number;
  tradesPerActiveDay: string;
  daysSinceLastTrade: number | null;
}

export interface CategoryExposure {
  category: string;
  tradeCount: number;
  marketCount: number;
  positionCount: number;
  volume: string;
  volumeShare: string;
}

export interface CopyReadinessDataValidation {
  tradeCount: number;
  marketCount: number;
  positionCount: number;
  oldestTradeAt: string | null;
  latestTradeAt: string | null;
  lastSyncedAt: string | null;
  syncedWindowDays: number;
  categoryCoverageRatio: string;
  unknownCategoryMarketCount: number;
  source: string;
  adapterVersion: string | null;
  coverageNote: string;
  apiWindowLimited: boolean;
}

export interface CopyReadinessInterpretation {
  status: "ready" | "watch" | "avoid";
  title: string;
  message: string;
  nextActions: string[];
}

export interface OversizedTrade {
  tradeId: string;
  marketId: string;
  marketTitle?: string | null;
  conditionId: string;
  outcome: string;
  timestamp: string;
  side: "buy" | "sell";
  price: string;
  size: string;
  value: string;
  methods: Array<"threshold" | "topPercent" | "relative">;
  result: "open" | "win" | "loss" | "flat";
  realizedPnl: string;
}

export interface OversizedTradeSummary {
  count: number;
  roi: string;
  winrate: string;
  largestWin: string;
  largestLoss: string;
}

export interface CopyReadiness {
  readinessScore: number;
  dataCoverageScore: number;
  freshnessScore: number;
  activityScore: number;
  liquidityScore: number;
  positionSizeScore: number;
  activityCadence: ActivityCadence;
  categoryExposure: CategoryExposure[];
  oversizedTrades: OversizedTrade[];
  oversizedTradeSummary: OversizedTradeSummary;
  dataValidation: CopyReadinessDataValidation;
  interpretation: CopyReadinessInterpretation;
  warnings: ReadinessWarning[];
  config: CopyReadinessConfig;
  updatedAt: string | null;
}

export type CopySimulationAction = "entry" | "add" | "reduce" | "close";

export interface CopySimulationOversizedConfig {
  oversizedThreshold: string;
  topPercent: number;
  relativeMultiplier: string;
}

export interface CopySimulationSettings {
  startingBalance: string;
  copyPercentage: string;
  fixedCopyAmount: string | null;
  maxPositionSize: string | null;
  minPositionSize: string;
  maxMarketExposure: string | null;
  maxTotalExposure: string | null;
  delaySeconds: number;
  allowedActions: CopySimulationAction[];
  includeCategories: string[];
  excludeCategories: string[];
  includeUnresolvedMarkets: boolean;
  liquidityFilterEnabled: boolean;
  excludeOversizedTrades: boolean;
  oversizedConfig: CopySimulationOversizedConfig | null;
  drawdownStopPercent: string | null;
}

export type CopySimulationMissedReason =
  | "ACTION_FILTERED"
  | "CATEGORY_EXCLUDED"
  | "UNRESOLVED_MARKET_EXCLUDED"
  | "OVERSIZED_TRADE"
  | "LIQUIDITY_FILTERED"
  | "DRAWDOWN_STOP"
  | "BELOW_MIN_SIZE"
  | "MAX_POSITION_SIZE"
  | "MAX_MARKET_EXPOSURE"
  | "MAX_TOTAL_EXPOSURE"
  | "INSUFFICIENT_BALANCE"
  | "NOTHING_TO_REDUCE";

export type CopySimulationFillMethod = "actual" | "history" | "slippage";

export interface CopySimulationLedgerRow {
  sourceTradeId: string;
  marketId: string;
  marketTitle?: string | null;
  conditionId: string;
  outcome: string;
  action: CopySimulationAction;
  side: "buy" | "sell";
  traderTimestamp: string;
  executedAt: string;
  executionPrice: string;
  fillMethod: CopySimulationFillMethod;
  shares: string;
  value: string;
  realizedPnl: string;
  cashAfter: string;
  openExposureAfter: string;
}

export interface CopySimulationMissedRow {
  sourceTradeId: string;
  marketId: string;
  marketTitle?: string | null;
  conditionId: string;
  outcome: string;
  action: CopySimulationAction;
  timestamp: string;
  reason: CopySimulationMissedReason;
  detail: string;
}

export interface CopySimulationEquityPoint {
  date: string;
  cash: string;
  openExposure: string;
  equity: string;
}

export interface CopySimulationCategoryBreakdown {
  category: string;
  copiedTradeCount: number;
  missedTradeCount: number;
  volume: string;
  realizedPnl: string;
}

export interface CopySimulationSummary {
  startingBalance: string;
  endingCash: string;
  openPositionValue: string;
  endingEquity: string;
  realizedPnl: string;
  unrealizedPnl: string;
  totalPnl: string;
  roi: string;
  winrate: string;
  copiedTradeCount: number;
  closedCopyTradeCount: number;
  missedTradeCount: number;
  missedReasonCounts: Record<string, number>;
  fillMethodCounts: Record<string, number>;
  maxDrawdown: string;
  maxDrawdownPercent: string;
  drawdownStopTriggered: boolean;
}

export interface CopySimulationDelaySensitivityPoint {
  delaySeconds: number;
  roi: string;
  totalPnl: string;
  copiedTradeCount: number;
  missedTradeCount: number;
}

export interface CopySimulationResult {
  settings: CopySimulationSettings;
  summary: CopySimulationSummary;
  ledger: CopySimulationLedgerRow[];
  missedTrades: CopySimulationMissedRow[];
  equityCurve: CopySimulationEquityPoint[];
  categoryBreakdown: CopySimulationCategoryBreakdown[];
  delaySensitivity: CopySimulationDelaySensitivityPoint[];
}

export interface CopySizingSuggestion {
  tradeCount: number;
  medianTradeValue: string;
  p25TradeValue: string;
  p75TradeValue: string;
  recommendedCopyPercentage: string;
  recommendedMinPositionSize: string;
}

export interface CopySimulationRecord {
  id: string;
  walletAddress: string;
  createdAt: string;
  settings: CopySimulationSettings;
  result: CopySimulationResult;
}

export interface CopySimulationListItem {
  id: string;
  walletAddress: string;
  createdAt: string;
  settings: CopySimulationSettings;
  summary: CopySimulationSummary;
}

export interface WalletRankingComponentDto {
  score: number | null;
  weight: number;
  detail?: string;
}

export interface WalletRankingDto {
  walletAddress: string;
  finalScore: number;
  classification:
    | "Prime copy candidate"
    | "Strong copy candidate"
    | "Watchlist candidate"
    | "High-risk candidate"
    | "Avoid copying";
  components: {
    simulatedRoi: WalletRankingComponentDto;
    realizedRoi: WalletRankingComponentDto;
    drawdown: WalletRankingComponentDto;
    consistency: WalletRankingComponentDto;
    recentPerformance: WalletRankingComponentDto;
    liquidity: WalletRankingComponentDto;
    dataConfidence: WalletRankingComponentDto;
    activity: WalletRankingComponentDto;
    delayTolerance: WalletRankingComponentDto;
    oversizedRisk: WalletRankingComponentDto;
    categoryFocus: WalletRankingComponentDto;
  };
  warnings: Array<{ code: string; severity: "info" | "warning" | "critical"; message: string }>;
  weightsVersion: string;
  profile: {
    copyBalance: string;
    maxPositionSize: string;
    delaySeconds: number;
    includedCategories: string[];
  };
  updatedAt: string;
}

export interface WalletRankingLeaderboardRow extends WalletRankingDto {
  totalPnl: string;
  roi: string;
  tradeCount: number;
  lastSyncedAt: string | null;
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
