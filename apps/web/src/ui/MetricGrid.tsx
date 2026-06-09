import type { WalletOverview } from "@polyand/types";
import { formatAmount, formatDate, formatPercent } from "../utils/format";
import { InfoTooltip } from "./InfoTooltip";

interface MetricGridProps {
  overview: WalletOverview | null;
  loading: boolean;
}

export function MetricGrid({ overview, loading }: MetricGridProps) {
  const metrics: MetricItem[] = [
    {
      label: "Total PnL",
      value: formatAmount(overview?.totalPnl, "usd"),
      description: "Total profit and loss across reconstructed positions. Positive means the wallet is currently ahead.",
      tone: toneFromNumber(overview?.totalPnl)
    },
    {
      label: "Volume",
      value: formatAmount(overview?.volume, "usd"),
      description: "Total traded notional value observed for this wallet.",
      tone: "neutral"
    },
    {
      label: "Winrate",
      value: formatPercent(overview?.winrate),
      description: "V1 position winrate based on reconstructed profitable positions.",
      tone: toneFromRatio(overview?.winrate)
    },
    {
      label: "Trades",
      value: String(overview?.tradeCount ?? 0),
      description: "Number of normalized Polymarket trades stored after the latest sync.",
      tone: "neutral"
    },
    {
      label: "Markets",
      value: String(overview?.marketCount ?? 0),
      description: "Unique markets represented in the wallet trade history.",
      tone: "neutral"
    },
    {
      label: "Drawdown",
      value: formatAmount(overview?.drawdown, "usd"),
      description: "Largest decline from a prior cumulative PnL peak. Lower is better.",
      tone: Number(overview?.drawdown ?? 0) > 0 ? "risk" : "neutral"
    },
    {
      label: "Last Activity",
      value: formatDate(overview?.lastActivity),
      description: "Most recent trade timestamp returned by the backend.",
      tone: "neutral"
    },
    {
      label: "Last Sync",
      value: formatDate(overview?.lastSyncedAt),
      description: "Most recent successful backend wallet sync time.",
      tone: "neutral"
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-md border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${indicatorClass(metric.tone)}`} />
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{metric.label}</div>
            </div>
            <InfoTooltip label={`${metric.label} explanation`} description={metric.description} />
          </div>
          <div className={`mt-2 break-words text-xl font-semibold tabular-nums ${valueClass(metric.tone)}`}>
            {loading ? "..." : metric.value}
          </div>
        </div>
      ))}
    </div>
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
