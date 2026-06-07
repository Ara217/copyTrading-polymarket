import type { WalletOverview } from "@polyand/types";
import { formatAmount, formatDate, formatPercent } from "../utils/format";

interface MetricGridProps {
  overview: WalletOverview | null;
  loading: boolean;
}

export function MetricGrid({ overview, loading }: MetricGridProps) {
  const metrics = [
    ["Total PnL", formatAmount(overview?.totalPnl, "usd")],
    ["Volume", formatAmount(overview?.volume, "usd")],
    ["Winrate", formatPercent(overview?.winrate)],
    ["Trades", String(overview?.tradeCount ?? 0)],
    ["Markets", String(overview?.marketCount ?? 0)],
    ["Last Activity", formatDate(overview?.lastActivity)],
    ["Last Sync", formatDate(overview?.lastSyncedAt)]
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {metrics.map(([label, value]) => (
        <div key={label} className="rounded-md border border-line bg-white p-3">
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-1 truncate text-lg font-semibold tabular-nums text-ink">
            {loading ? "..." : value}
          </div>
        </div>
      ))}
    </div>
  );
}
