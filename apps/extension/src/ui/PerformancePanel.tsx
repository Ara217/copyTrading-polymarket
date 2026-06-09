import type { WalletPerformance } from "@polyand/types";
import { formatAmount, formatPercent } from "../utils/format";
import { InfoTooltip, SectionHeader } from "./InfoTooltip";

interface PerformancePanelProps {
  performance: WalletPerformance | null;
}

export function PerformancePanel({ performance }: PerformancePanelProps) {
  const metrics: MetricItem[] = [
    ["Realized", formatAmount(performance?.realizedPnl, "usd"), "Locked-in PnL from closed sells.", toneFromNumber(performance?.realizedPnl)],
    ["Unrealized", formatAmount(performance?.unrealizedPnl, "usd"), "Estimated PnL still open.", toneFromNumber(performance?.unrealizedPnl)],
    ["ROI", formatPercent(performance?.roi), "Total PnL divided by buy-side capital.", toneFromNumber(performance?.roi)],
    ["Trade WR", formatPercent(performance?.tradeWinrate), "Positive closed trade share.", toneFromRatio(performance?.tradeWinrate)],
    ["Market WR", formatPercent(performance?.marketWinrate), "Profitable position share.", toneFromRatio(performance?.marketWinrate)],
    ["Resolved WR", formatPercent(performance?.resolvedMarketWinrate), "Winrate on resolved markets only.", toneFromRatio(performance?.resolvedMarketWinrate)],
    ["Max DD", formatAmount(performance?.maxDrawdown, "usd"), "Worst drop from PnL peak.", Number(performance?.maxDrawdown ?? 0) > 0 ? "risk" : "neutral"],
    ["Current DD", formatAmount(performance?.currentDrawdown, "usd"), "Current distance below PnL peak.", Number(performance?.currentDrawdown ?? 0) > 0 ? "risk" : "neutral"]
  ];

  return (
    <div className="mt-3 rounded-md border border-line bg-white">
      <SectionHeader
        title="V2 Performance"
        description="Advanced analytics calculated on the backend from reconstructed wallet positions and closed trades."
      />
      <div className="grid grid-cols-4 gap-px bg-line text-xs">
        {metrics.map(([label, value, description, tone]) => (
          <div key={label} className="bg-white p-2">
            <div className="flex items-center justify-between gap-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${indicatorClass(tone)}`} />
                <div className="truncate text-slate-500">{label}</div>
              </div>
              <InfoTooltip label={`${label} explanation`} description={description} />
            </div>
            <div className={`mt-1 font-semibold tabular-nums ${valueClass(tone)}`}>{value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-line bg-line text-xs">
        <div className="bg-white p-2">
          <div className="text-slate-500">Win Streak</div>
          <div className="mt-1 font-semibold tabular-nums">{performance?.longestWinStreak ?? 0}</div>
        </div>
        <div className="bg-white p-2">
          <div className="text-slate-500">Loss Streak</div>
          <div className="mt-1 font-semibold tabular-nums">{performance?.longestLossStreak ?? 0}</div>
        </div>
      </div>
    </div>
  );
}

type MetricTone = "positive" | "negative" | "risk" | "neutral";

type MetricItem = [label: string, value: string, description: string, tone: MetricTone];

function toneFromNumber(value: string | number | null | undefined): MetricTone {
  const numeric = Number(value ?? 0);
  if (numeric > 0) return "positive";
  if (numeric < 0) return "negative";
  return "neutral";
}

function toneFromRatio(value: string | number | null | undefined): MetricTone {
  const numeric = Number(value ?? 0);
  if (numeric >= 0.55) return "positive";
  if (numeric > 0 && numeric < 0.45) return "negative";
  return "neutral";
}

function indicatorClass(tone: MetricTone): string {
  if (tone === "positive") return "bg-profit";
  if (tone === "negative" || tone === "risk") return "bg-loss";
  return "bg-slate-300";
}

function valueClass(tone: MetricTone): string {
  if (tone === "positive") return "text-profit";
  if (tone === "negative" || tone === "risk") return "text-loss";
  return "text-ink";
}
