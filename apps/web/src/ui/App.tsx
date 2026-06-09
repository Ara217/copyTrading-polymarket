import { useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Moon, RefreshCw, Search, Sun } from "lucide-react";
import type { PositionRow, TradeRow } from "@polyand/types";
import { useWalletStore } from "../store/walletStore";
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
    overview,
    trades,
    positions,
    pnlChart,
    performance,
    drawdownChart,
    profitDistribution,
    winLossChart,
    refreshJob,
    loading,
    error,
    setAddress,
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

  return (
    <main className={`min-h-screen bg-panel ${darkMode ? "dark" : ""}`}>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink text-white">
              <BarChart3 size={21} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold leading-6">Polyand Analytics</h1>
              <p className="text-sm text-slate-500">Full-page Polymarket wallet performance dashboard</p>
            </div>
          </div>
          {refreshJob ? (
            <div className="rounded-md border border-line px-3 py-2 text-sm text-slate-600">
              Job {refreshJob.jobId}: {refreshJob.status}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setDarkMode((value) => !value)}
            className="ml-3 inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white text-ink"
            title={darkMode ? "Use light mode" : "Use dark mode"}
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1440px] px-6 py-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="0x wallet address, Polymarket profile slug, or URL containing a wallet"
              className="h-11 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-signal"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void loadWallet()}
                className="flex h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-white"
                title="Load wallet analytics"
              >
                <Search size={16} />
                Load
              </button>
              <button
                type="button"
                onClick={() => void refresh()}
                className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-medium text-ink"
                title="Refresh wallet data"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
          <div className="mt-3 min-h-5 text-sm">
            {error ? <span className="font-medium text-loss">{error}</span> : <span className="text-slate-500">Manual wallet input available</span>}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1440px] gap-4 px-6 py-5">
        <MetricGrid overview={overview} loading={loading} />

        {selectedPosition ? (
          <section className="grid gap-4">
            <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => setSelectedPositionKey(null)}
                className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink"
              >
                <ArrowLeft size={16} />
                Back to positions
              </button>
              <div className="min-w-0 truncate text-sm text-slate-600">
                Related trades for <span className="font-medium text-ink">{selectedPosition.marketTitle ?? selectedPosition.marketId}</span>{" "}
                · {selectedPosition.outcome}
              </div>
            </div>
            <TradesTable
              trades={visibleTrades}
              syncedAt={overview?.lastSyncedAt}
              relatedPosition={selectedPosition}
              totalTradeCount={trades.length}
            />
          </section>
        ) : (
          <section className="grid gap-4">
            <PositionsTable
              positions={positions}
              syncedAt={overview?.lastSyncedAt}
              selectedPositionKey={selectedPositionKey}
              onSelectPosition={(position) => setSelectedPositionKey(positionKey(position))}
            />
          </section>
        )}

        <PerformancePanel performance={performance} />
        <TradeHighlights performance={performance} />
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <PnlChart points={pnlChart} />
          <V2Charts drawdown={drawdownChart} distribution={profitDistribution} winLoss={winLossChart} />
        </section>
      </div>
    </main>
  );
}

function positionKey(position: Pick<PositionRow, "marketId" | "outcome">): string {
  return `${position.marketId}:${position.outcome}`;
}

function isTradeForPosition(trade: TradeRow, position: PositionRow): boolean {
  return trade.marketId === position.marketId && trade.outcome === position.outcome;
}
