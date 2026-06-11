import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Moon, RefreshCw, Search, Sun } from "lucide-react";
import type { PositionRow, TradeRow } from "@polyand/types";
import { useWalletStore } from "../store/walletStore";
import { CopyReadinessPanel } from "./CopyReadinessPanel";
import { MetricGrid } from "./MetricGrid";
import { PnlChart } from "./PnlChart";
import { PositionsTable } from "./PositionsTable";
import { PerformancePanel } from "./PerformancePanel";
import { TradesTable } from "./TradesTable";
import { TradeHighlights } from "./TradeHighlights";
import { V2Charts } from "./V2Charts";

export function App() {
  const [selectedPositionKey, setSelectedPositionKey] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const {
    address,
    detectedAddress,
    overview,
    trades,
    positions,
    pnlChart,
    performance,
    copyReadiness,
    drawdownChart,
    profitDistribution,
    winLossChart,
    refreshJob,
    loading,
    error,
    setAddress,
    detectFromActiveTab,
    refresh,
    loadWallet
  } = useWalletStore();
  const selectedPosition = useMemo(
    () => positions.find((position) => positionKey(position) === selectedPositionKey) ?? null,
    [positions, selectedPositionKey]
  );
  const visibleTrades = useMemo(
    () => (selectedPosition ? trades.filter((trade) => isTradeForPosition(trade, selectedPosition)) : trades),
    [selectedPosition, trades]
  );

  useEffect(() => {
    void detectFromActiveTab();
  }, [detectFromActiveTab]);

  return (
    <main className={`flex min-h-[640px] flex-col bg-white ${darkMode ? "dark" : ""}`}>
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-white">
            <BarChart3 size={19} />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-5">Polyand Analytics</h1>
            <p className="text-xs text-slate-500">Polymarket wallet performance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {refreshJob ? (
            <div className="rounded-md border border-line px-3 py-1.5 text-xs text-slate-600">
              Job {refreshJob.jobId}: {refreshJob.status}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setDarkMode((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-ink"
            title={darkMode ? "Use light mode" : "Use dark mode"}
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      <section className="border-b border-line bg-panel px-5 py-4">
        <div className="flex gap-2">
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="0x wallet address or detected Polymarket URL wallet"
            className="h-10 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-signal"
          />
          <button
            type="button"
            onClick={() => void loadWallet()}
            className="flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-white"
            title="Load wallet analytics"
          >
            <Search size={16} />
            Load
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-medium text-ink"
            title="Refresh wallet data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
        <div className="mt-2 flex min-h-5 items-center justify-between text-xs">
          <span className="text-slate-500">
            {detectedAddress ? `Detected from active tab: ${detectedAddress}` : "Manual wallet input available"}
          </span>
          {error ? <span className="font-medium text-loss">{error}</span> : null}
        </div>
      </section>

      <section className="grid gap-4 px-5 py-4">
        <MetricGrid overview={overview} loading={loading} />
        {selectedPosition ? (
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2 rounded-md border border-line bg-white px-3 py-2 text-xs">
              <button
                type="button"
                onClick={() => setSelectedPositionKey(null)}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2 py-1.5 font-medium text-ink"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <div className="min-w-0 truncate text-slate-600">
                {selectedPosition.marketTitle ?? selectedPosition.marketId} · {selectedPosition.outcome}
              </div>
            </div>
            <TradesTable
              trades={visibleTrades}
              syncedAt={overview?.lastSyncedAt}
              relatedPosition={selectedPosition}
              totalTradeCount={trades.length}
            />
          </div>
        ) : (
        <PositionsTable
          positions={positions}
          syncedAt={overview?.lastSyncedAt}
          selectedPositionKey={selectedPositionKey}
          onSelectPosition={(position) => setSelectedPositionKey(positionKey(position))}
        />
        )}
      </section>

      {!selectedPosition ? (
        <section className="grid gap-3 border-t border-line px-5 py-4">
          <CopyReadinessPanel readiness={copyReadiness} />
          <PerformancePanel performance={performance} />
          <PnlChart points={pnlChart} />
          <V2Charts drawdown={drawdownChart} distribution={profitDistribution} winLoss={winLossChart} />
          <TradeHighlights performance={performance} />
        </section>
      ) : null}
    </main>
  );
}

function positionKey(position: Pick<PositionRow, "marketId" | "outcome">): string {
  return `${position.marketId}:${position.outcome}`;
}

function isTradeForPosition(trade: TradeRow, position: PositionRow): boolean {
  return trade.marketId === position.marketId && trade.outcome === position.outcome;
}
