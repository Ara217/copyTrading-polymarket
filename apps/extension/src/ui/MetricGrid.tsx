import type { WalletOverview } from "@polyand/types";
import { formatAmount, formatDate, formatPercent } from "../utils/format";
import { InfoTooltip } from "./InfoTooltip";

interface MetricGridProps {
  overview: WalletOverview | null;
  loading: boolean;
}

export function MetricGrid({ overview, loading }: MetricGridProps) {
  const metrics: MetricItem[] = [
    ["Total PnL", formatAmount(overview?.totalPnl, "usd"), "Total reconstructed profit and loss.", toneFromNumber(overview?.totalPnl)],
    ["Volume", formatAmount(overview?.volume, "usd"), "Total traded notional value.", "neutral"],
    ["Winrate", formatPercent(overview?.winrate), "V1 position winrate.", toneFromRatio(overview?.winrate)],
    ["Trades", String(overview?.tradeCount ?? 0), "Stored normalized trades.", "neutral"],
    ["Markets", String(overview?.marketCount ?? 0), "Unique markets traded.", "neutral"],
    ["Last Activity", formatDate(overview?.lastActivity), "Most recent trade time.", "neutral"],
    ["Last Sync", formatDate(overview?.lastSyncedAt), "Most recent backend sync.", "neutral"]
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {metrics.map(([label, value, description, tone]) => (
        <div key={label} className="rounded-md border border-line bg-white p-3">
          <div className="flex items-center justify-between gap-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${indicatorClass(tone)}`} />
              <div className="truncate text-xs text-slate-500">{label}</div>
            </div>
            <InfoTooltip label={`${label} explanation`} description={description} />
          </div>
          <div className={`mt-1 truncate text-lg font-semibold tabular-nums ${valueClass(tone)}`}>
            {loading ? "..." : value}
          </div>
        </div>
      ))}
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
