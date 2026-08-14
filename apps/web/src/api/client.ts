import type {
  ApiFailure,
  ApiSuccess,
  CopyReadiness,
  CopySimulationAction,
  CopySimulationListItem,
  CopySimulationRecord,
  CopySizingSuggestion,
  DrawdownChartPoint,
  PnlChartPoint,
  PositionRow,
  ProfitDistributionBucket,
  RefreshWalletResponse,
  TradeRow,
  WalletOverview,
  WalletPerformance,
  WalletRankingDto,
  WalletRankingLeaderboardRow,
  WinLossChartPoint
} from "@polyand/types";

export interface WalletRankingsQuery {
  page?: number;
  pageSize?: number;
  sort?: "finalScore" | "simulatedRoiScore" | "recentPerformanceScore";
  classification?: WalletRankingLeaderboardRow["classification"];
  minScore?: number;
}

export interface WalletRankingsPage {
  data: WalletRankingLeaderboardRow[];
  meta: { page: number; pageSize: number; total: number; sort: string };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

export interface CopySimulationRequest {
  startingBalance: number;
  copyPercentage: number;
  fixedCopyAmount: number | null;
  maxPositionSize: number | null;
  minPositionSize: number;
  maxMarketExposure: number | null;
  maxTotalExposure: number | null;
  delaySeconds: number;
  allowedActions: CopySimulationAction[];
  includeCategories: string[];
  excludeCategories: string[];
  includeUnresolvedMarkets: boolean;
  liquidityFilterEnabled: boolean;
  excludeOversizedTrades: boolean;
  drawdownStopPercent: number | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const body = (await response.json()) as ApiSuccess<T> | ApiFailure;

  if (!response.ok || "error" in body) {
    const message = "error" in body ? body.error.message : "API request failed";
    throw new Error(message);
  }

  return body.data;
}

export const api = {
  refreshWallet: (address: string) =>
    request<RefreshWalletResponse>(`/wallets/${encodeURIComponent(address)}/refresh`, { method: "POST" }),
  getOverview: (address: string) => request<WalletOverview>(`/wallets/${encodeURIComponent(address)}/overview`),
  getTrades: (address: string) =>
    request<TradeRow[]>(`/wallets/${encodeURIComponent(address)}/trades?limit=500&offset=0`),
  getPositions: (address: string) => request<PositionRow[]>(`/wallets/${encodeURIComponent(address)}/positions`),
  getPnlChart: (address: string) => request<PnlChartPoint[]>(`/wallets/${encodeURIComponent(address)}/pnl-chart`),
  getPerformance: (address: string) =>
    request<WalletPerformance>(`/wallets/${encodeURIComponent(address)}/performance`),
  getDrawdownChart: (address: string) =>
    request<DrawdownChartPoint[]>(`/wallets/${encodeURIComponent(address)}/drawdown-chart`),
  getProfitDistribution: (address: string) =>
    request<ProfitDistributionBucket[]>(`/wallets/${encodeURIComponent(address)}/profit-distribution`),
  getWinLossChart: (address: string) =>
    request<WinLossChartPoint[]>(`/wallets/${encodeURIComponent(address)}/win-loss-chart`),
  getCopyReadiness: (address: string) =>
    request<CopyReadiness>(`/wallets/${encodeURIComponent(address)}/copy-readiness`),
  getCopySizingSuggestion: (address: string) =>
    request<CopySizingSuggestion>(`/wallets/${encodeURIComponent(address)}/copy-sizing-suggestion`),
  runCopySimulation: (address: string, settings: CopySimulationRequest) =>
    request<CopySimulationRecord>(`/wallets/${encodeURIComponent(address)}/copy-simulations`, {
      method: "POST",
      body: JSON.stringify(settings)
    }),
  listCopySimulations: (address: string) =>
    request<CopySimulationListItem[]>(`/wallets/${encodeURIComponent(address)}/copy-simulations`),
  getCopySimulation: (address: string, id: string) =>
    request<CopySimulationRecord>(
      `/wallets/${encodeURIComponent(address)}/copy-simulations/${encodeURIComponent(id)}`
    ),
  getWalletRanking: (address: string) =>
    request<WalletRankingDto>(`/wallets/${encodeURIComponent(address)}/ranking`),
  // Unlike other endpoints, the leaderboard's pagination lives in `meta`, so we
  // return the raw envelope rather than unwrapping to `.data` via request<T>.
  listWalletRankings: async (query: WalletRankingsQuery = {}): Promise<WalletRankingsPage> => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) params.set(key, String(value));
    }
    const qs = params.toString();
    const response = await fetch(`${API_BASE_URL}/rankings/wallets${qs ? `?${qs}` : ""}`, {
      headers: { "content-type": "application/json" }
    });
    const body = (await response.json()) as
      | (ApiSuccess<WalletRankingLeaderboardRow[]> & { meta: WalletRankingsPage["meta"] })
      | ApiFailure;
    if (!response.ok || "error" in body) {
      throw new Error("error" in body ? body.error.message : "API request failed");
    }
    return { data: body.data, meta: body.meta };
  }
};
