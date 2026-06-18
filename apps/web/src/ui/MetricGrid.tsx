import type { WalletOverview } from "@polyand/types";
import { formatAmount, formatDate, formatPercent } from "../utils/format";
import { InfoTooltip } from "./InfoTooltip";

interface MetricGridProps {
  overview: WalletOverview | null;
  loading: boolean;
}

export function MetricGrid({ overview, loading }: MetricGridProps) {
  const totalTone = toneFromNumber(overview?.totalPnl);

  return (
    <div className="space-y-3">
      <div
        className={[
          "rounded-lg border bg-white p-5",
          totalTone === "positive"
            ? "border-profit/30"
            : totalTone === "negative"
              ? "border-loss/30"
              : "border-line"
        ].join(" ")}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Total PnL</span>
              <InfoTooltip
                label="Total PnL explanation"
                description="Total profit and loss across reconstructed positions. Positive means the wallet is currently ahead."
              />
            </div>
            <div
              className={`mt-1 text-3xl font-semibold tabular-nums ${
                totalTone === "positive"
                  ? "text-profit"
                  : totalTone === "negative"
                    ? "text-loss"
                    : "text-ink"
              }`}
            >
              {loading ? "…" : formatAmount(overview?.totalPnl, "usd")}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
            <Compact label="Volume" value={loading ? "…" : formatAmount(overview?.volume, "usd")} />
            <Compact
              label="Winrate"
              value={loading ? "…" : formatPercent(overview?.winrate)}
              tone={toneFromRatio(overview?.winrate)}
            />
            <Compact label="Trades" value={loading ? "…" : String(overview?.tradeCount ?? 0)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SecondaryTile
          label="Markets"
          value={loading ? "…" : String(overview?.marketCount ?? 0)}
          description="Unique markets represented in the wallet trade history."
        />
        <SecondaryTile
          label="Drawdown"
          value={loading ? "…" : formatAmount(overview?.drawdown, "usd")}
          tone={Number(overview?.drawdown ?? 0) > 0 ? "negative" : "neutral"}
          description="Largest decline from a prior cumulative PnL peak. Lower is better."
        />
        <SecondaryTile
          label="Last Activity"
          value={loading ? "…" : formatDate(overview?.lastActivity)}
          description="Most recent trade timestamp returned by the backend."
        />
        <SecondaryTile
          label="Last Sync"
          value={loading ? "…" : formatDate(overview?.lastSyncedAt)}
          description="Most recent successful backend wallet sync time."
        />
      </div>
    </div>
  );
}

type MetricTone = "positive" | "negative" | "neutral";

function Compact({ label, value, tone = "neutral" }: { label: string; value: string; tone?: MetricTone }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-0.5 text-base font-medium tabular-nums ${valueClass(tone)}`}>{value}</div>
    </div>
  );
}

function SecondaryTile({
  label,
  value,
  description,
  tone = "neutral"
}: {
  label: string;
  value: string;
  description: string;
  tone?: MetricTone;
}) {
  return (
    <div className="rounded-lg border border-line bg-white px-4 py-3">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>
        <InfoTooltip label={`${label} explanation`} description={description} />
      </div>
      <div className={`mt-1 break-words text-lg font-medium tabular-nums ${valueClass(tone)}`}>{value}</div>
    </div>
  );
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

function valueClass(tone: MetricTone): string {
  if (tone === "positive") return "text-profit";
  if (tone === "negative") return "text-loss";
  return "text-ink";
}
