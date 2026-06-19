import { create } from "zustand";
import type {
  DrawdownChartPoint,
  CopyReadiness,
  PnlChartPoint,
  PositionRow,
  ProfitDistributionBucket,
  RefreshWalletResponse,
  TradeRow,
  WalletOverview,
  WalletPerformance,
  WalletRankingDto,
  WinLossChartPoint
} from "@polyand/types";
import { extractWalletIdentifierFromText, parseWalletIdentifier } from "@polyand/shared";
import { api } from "../api/client";

interface WalletState {
  address: string;
  overview: WalletOverview | null;
  trades: TradeRow[];
  positions: PositionRow[];
  pnlChart: PnlChartPoint[];
  performance: WalletPerformance | null;
  copyReadiness: CopyReadiness | null;
  drawdownChart: DrawdownChartPoint[];
  profitDistribution: ProfitDistributionBucket[];
  winLossChart: WinLossChartPoint[];
  ranking: WalletRankingDto | null;
  refreshJob: RefreshWalletResponse | null;
  loading: boolean;
  error: string | null;
  setAddress: (address: string) => void;
  refresh: () => Promise<string>;
  loadWallet: (addressOverride?: string) => Promise<string>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: "",
  overview: null,
  trades: [],
  positions: [],
  pnlChart: [],
  performance: null,
  copyReadiness: null,
  drawdownChart: [],
  profitDistribution: [],
  winLossChart: [],
  ranking: null,
  refreshJob: null,
  loading: false,
  error: null,
  setAddress: (address) => set({ address, error: null }),
  refresh: async () => {
    const address = normalizeIdentifier(get().address);
    set({ loading: true, error: null });
    try {
      const refreshJob = await api.refreshWallet(address);
      set({ address, refreshJob });
      return address;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Refresh failed" });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  loadWallet: async (addressOverride) => {
    const address = normalizeIdentifier(addressOverride ?? get().address);
    set({ loading: true, error: null });
    try {
      const [
        overview,
        trades,
        positions,
        pnlChart,
        performance,
        copyReadiness,
        drawdownChart,
        profitDistribution,
        winLossChart,
        ranking
      ] =
        await Promise.all([
        api.getOverview(address),
        api.getTrades(address),
        api.getPositions(address),
        api.getPnlChart(address),
        api.getPerformance(address),
        api.getCopyReadiness(address),
        api.getDrawdownChart(address),
        api.getProfitDistribution(address),
        api.getWinLossChart(address),
        api.getWalletRanking(address).catch(() => null)
      ]);
      set({ address, overview, trades, positions, pnlChart, performance, copyReadiness, drawdownChart, profitDistribution, winLossChart, ranking });
      return address;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Wallet load failed" });
      throw error;
    } finally {
      set({ loading: false });
    }
  }
}));

function normalizeIdentifier(input: string): string {
  const extracted = extractWalletIdentifierFromText(input);
  return extracted ?? parseWalletIdentifier(input);
}
