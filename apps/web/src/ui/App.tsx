import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, BarChart3, ChevronDown, Moon, RefreshCw, Search, Sun } from "lucide-react";
import type { PositionRow, TradeRow } from "@polyand/types";
import { useWalletStore } from "../store/walletStore";
import { CopyReadinessPanel } from "./CopyReadinessPanel";
import { CopySimulatorPanel } from "./CopySimulatorPanel";
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
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    positions: false,
    copyReadiness: true,
    copySimulator: true,
    performance: true,
    highlights: true,
    charts: true
  });
  const {
    address,
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
    refresh,
    loadWallet
  } = useWalletStore();

  useEffect(() => {
    const walletFromUrl = getWalletFromUrl();
    if (!walletFromUrl) {
      return;
    }

    setAddress(walletFromUrl);
    void loadWallet(walletFromUrl).catch(() => undefined);
  }, [loadWallet, setAddress]);

  const selectedPosition = useMemo(
    () => positions.find((position) => positionKey(position) === selectedPositionKey) ?? null,
    [positions, selectedPositionKey]
  );
  const visibleTrades = useMemo(
    () => (selectedPosition ? trades.filter((trade) => isTradeForPosition(trade, selectedPosition)) : trades),
    [selectedPosition, trades]
  );
  const handleLoadWallet = async () => {
    const loadedAddress = await loadWallet();
    updateWalletUrl(loadedAddress);
    setSelectedPositionKey(null);
  };
  const handleRefreshWallet = async () => {
    const refreshedAddress = await refresh();
    updateWalletUrl(refreshedAddress);
  };
  const toggleSection = (section: string) => {
    setCollapsedSections((current) => ({ ...current, [section]: !current[section] }));
  };

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
                onClick={() => void handleLoadWallet()}
                className="flex h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-white"
                title="Load wallet analytics"
              >
                <Search size={16} />
                Load
              </button>
              <button
                type="button"
                onClick={() => void handleRefreshWallet()}
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
          <CollapsibleSection
            title="Positions"
            description={`${positions.length} reconstructed positions. Click a row to inspect related trade history.`}
            collapsed={collapsedSections.positions}
            onToggle={() => toggleSection("positions")}
          >
            <PositionsTable
              positions={positions}
              syncedAt={overview?.lastSyncedAt}
              selectedPositionKey={selectedPositionKey}
              onSelectPosition={(position) => setSelectedPositionKey(positionKey(position))}
              showHeader={false}
              embedded
            />
          </CollapsibleSection>
        )}

        {!selectedPosition ? (
          <>
            <CollapsibleSection
              title="Copy Readiness"
              description={
                copyReadiness
                  ? `${copyReadiness.interpretation.title}. Score ${copyReadiness.readinessScore}; ${copyReadiness.warnings.length} warnings.`
                  : "Decision-support checks for whether this wallet is worth copy-simulation later."
              }
              collapsed={collapsedSections.copyReadiness}
              onToggle={() => toggleSection("copyReadiness")}
            >
              <CopyReadinessPanel readiness={copyReadiness} showHeader={false} embedded />
            </CollapsibleSection>
            <CollapsibleSection
              title="Copy Trading Simulator"
              description="Replay this wallet's history as a manual copy strategy with your own balance, sizing, delay, and filters."
              collapsed={collapsedSections.copySimulator}
              onToggle={() => toggleSection("copySimulator")}
            >
              <CopySimulatorPanel address={overview?.address ?? ""} showHeader={false} embedded />
            </CollapsibleSection>
            <CollapsibleSection
              title="Performance"
              description="Realized/unrealized PnL, ROI, winrates, drawdown, and streaks."
              collapsed={collapsedSections.performance}
              onToggle={() => toggleSection("performance")}
            >
              <PerformancePanel performance={performance} />
            </CollapsibleSection>
            <CollapsibleSection
              title="Trade Highlights"
              description="Best and worst closed trades from the loaded trade history."
              collapsed={collapsedSections.highlights}
              onToggle={() => toggleSection("highlights")}
            >
              <TradeHighlights performance={performance} />
            </CollapsibleSection>
            <CollapsibleSection
              title="Charts"
              description="PnL, drawdown, profit distribution, and win/loss charts."
              collapsed={collapsedSections.charts}
              onToggle={() => toggleSection("charts")}
            >
              <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <PnlChart points={pnlChart} />
                <V2Charts drawdown={drawdownChart} distribution={profitDistribution} winLoss={winLossChart} />
              </section>
            </CollapsibleSection>
          </>
        ) : null}
      </div>
    </main>
  );
}

function CollapsibleSection({
  title,
  description,
  collapsed,
  onToggle,
  children
}: {
  title: string;
  description: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-line bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={!collapsed}
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">{title}</div>
          <div className="mt-1 text-xs text-slate-500">{description}</div>
        </div>
        <ChevronDown className={`shrink-0 text-slate-500 transition-transform ${collapsed ? "-rotate-90" : ""}`} size={18} />
      </button>
      {collapsed ? null : <div className="border-t border-line">{children}</div>}
    </section>
  );
}

function positionKey(position: Pick<PositionRow, "marketId" | "outcome">): string {
  return `${position.marketId}:${position.outcome}`;
}

function isTradeForPosition(trade: TradeRow, position: PositionRow): boolean {
  return trade.marketId === position.marketId && trade.outcome === position.outcome;
}

function getWalletFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("wallet");
}

function updateWalletUrl(walletAddress: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("wallet", walletAddress);
  window.history.replaceState({}, "", url.toString());
}
