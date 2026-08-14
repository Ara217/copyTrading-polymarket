import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, RefreshCw } from "lucide-react";
import type { PositionRow, TradeRow } from "@polyand/types";
import { useWalletStore } from "../store/walletStore";
import { CopyabilityCard } from "./CopyabilityCard";
import { CopyReadinessPanel } from "./CopyReadinessPanel";
import { CopySimulatorPanel } from "./CopySimulatorPanel";
import { MetricGrid } from "./MetricGrid";
import { PnlChart } from "./PnlChart";
import { PositionsTable } from "./PositionsTable";
import { PerformancePanel } from "./PerformancePanel";
import { TradesTable } from "./TradesTable";
import { TradeHighlights } from "./TradeHighlights";
import { V2Charts } from "./V2Charts";

export function WalletPage() {
  const { address: addressParam } = useParams<{ address: string }>();
  const [selectedPositionKey, setSelectedPositionKey] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    positions: false,
    copyability: false,
    copyReadiness: true,
    copySimulator: true,
    performance: true,
    highlights: true,
    charts: true
  });
  const {
    overview,
    trades,
    positions,
    pnlChart,
    performance,
    copyReadiness,
    ranking,
    drawdownChart,
    profitDistribution,
    winLossChart,
    refreshJob,
    loading,
    error,
    refresh,
    loadWallet
  } = useWalletStore();

  useEffect(() => {
    if (!addressParam) return;
    setSelectedPositionKey(null);
    void loadWallet(addressParam).catch(() => undefined);
  }, [addressParam, loadWallet]);

  const selectedPosition = useMemo(
    () => positions.find((position) => positionKey(position) === selectedPositionKey) ?? null,
    [positions, selectedPositionKey]
  );
  const visibleTrades = useMemo(
    () => (selectedPosition ? trades.filter((trade) => isTradeForPosition(trade, selectedPosition)) : trades),
    [selectedPosition, trades]
  );
  const toggleSection = (section: string) => {
    setCollapsedSections((current) => ({ ...current, [section]: !current[section] }));
  };

  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-6 py-4">
          <div className="min-h-5 text-sm">
            {error ? (
              <span className="font-medium text-loss">{error}</span>
            ) : refreshJob ? (
              <span className="text-slate-600">
                Job {refreshJob.jobId}: {refreshJob.status}
              </span>
            ) : (
              <span className="text-slate-500 break-all">{addressParam}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => void refresh().catch(() => undefined)}
            className="flex h-10 shrink-0 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-medium text-ink"
            title="Refresh wallet data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
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
              apiWindowLimited={copyReadiness?.dataValidation.apiWindowLimited}
            />
          </CollapsibleSection>
        )}

        {!selectedPosition ? (
          <>
            <CollapsibleSection
              title="Copyability"
              description={
                ranking
                  ? `${ranking.classification}. Score ${ranking.finalScore}; ${ranking.warnings.length} warnings.`
                  : "Copy-trading-specific 0–100 ranking. Refresh to compute."
              }
              collapsed={collapsedSections.copyability}
              onToggle={() => toggleSection("copyability")}
            >
              <CopyabilityCard ranking={ranking} />
            </CollapsibleSection>
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
    </>
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
