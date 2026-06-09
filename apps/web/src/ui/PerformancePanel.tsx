import type { WalletPerformance } from "@polyand/types";
import { formatAmount, formatPercent } from "../utils/format";
import { InfoTooltip, SectionHeader } from "./InfoTooltip";

interface PerformancePanelProps {
  performance: WalletPerformance | null;
}

export function PerformancePanel({ performance }: PerformancePanelProps) {
  const metrics: MetricItem[] = [
    {
      label: "Realized PnL",
      value: formatAmount(performance?.realizedPnl, "usd"),
      description: "Profit or loss already locked in by closed sell events.",
      tone: toneFromNumber(performance?.realizedPnl)
    },
    {
      label: "Unrealized PnL",
      value: formatAmount(performance?.unrealizedPnl, "usd"),
      description: "Estimated profit or loss still open in current positions.",
      tone: toneFromNumber(performance?.unrealizedPnl)
    },
    {
      label: "ROI",
      value: formatPercent(performance?.roi),
      description: "Total PnL divided by observed buy-side capital.",
      tone: toneFromNumber(performance?.roi)
    },
    {
      label: "Trade Winrate",
      value: formatPercent(performance?.tradeWinrate),
      description: "Share of closed trade events with positive realized PnL.",
      tone: toneFromRatio(performance?.tradeWinrate)
    },
    {
      label: "Market Winrate",
      value: formatPercent(performance?.marketWinrate),
      description: "Share of reconstructed positions with positive total PnL.",
      tone: toneFromRatio(performance?.marketWinrate)
    },
    {
      label: "Resolved Winrate",
      value: formatPercent(performance?.resolvedMarketWinrate),
      description: "Winrate only across markets known to be resolved.",
      tone: toneFromRatio(performance?.resolvedMarketWinrate)
    },
    {
      label: "Max Drawdown",
      value: formatAmount(performance?.maxDrawdown, "usd"),
      description: "Worst fall from a prior cumulative PnL high. Lower is better.",
      tone: Number(performance?.maxDrawdown ?? 0) > 0 ? "risk" : "neutral"
    },
    {
      label: "Current Drawdown",
      value: formatAmount(performance?.currentDrawdown, "usd"),
      description: "Current distance below the best cumulative PnL peak.",
      tone: Number(performance?.currentDrawdown ?? 0) > 0 ? "risk" : "neutral"
    },
    {
      label: "Average Drawdown",
      value: formatAmount(performance?.averageDrawdown, "usd"),
      description: "Average non-zero drawdown during the reconstructed PnL path.",
      tone: Number(performance?.averageDrawdown ?? 0) > 0 ? "risk" : "neutral"
    },
    {
      label: "Win Streak",
      value: String(performance?.longestWinStreak ?? 0),
      description: "Longest run of profitable closed trade events.",
      tone: Number(performance?.longestWinStreak ?? 0) > 0 ? "positive" : "neutral"
    },
    {
      label: "Loss Streak",
      value: String(performance?.longestLossStreak ?? 0),
      description: "Longest run of losing closed trade events.",
      tone: Number(performance?.longestLossStreak ?? 0) > 0 ? "risk" : "neutral"
    }
  ];

  return (
    <section className="rounded-md border border-line bg-white">
      <SectionHeader
        title="V2 Performance Analytics"
        description="Backend-computed advanced wallet metrics. Money and percentages are calculated with Decimal.js and returned by the API."
      />
      <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-4 xl:grid-cols-6">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${indicatorClass(metric.tone)}`} />
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{metric.label}</div>
              </div>
              <InfoTooltip label={`${metric.label} explanation`} description={metric.description} />
            </div>
            <div className={`mt-2 break-words text-lg font-semibold tabular-nums ${valueClass(metric.tone)}`}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

type MetricTone = "positive" | "negative" | "risk" | "neutral";

interface MetricItem {
  label: string;
  value: string;
  description: string;
  tone: MetricTone;
}

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
