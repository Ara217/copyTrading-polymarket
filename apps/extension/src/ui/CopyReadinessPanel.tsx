import type { CopyReadiness } from "@polyand/types";
import { formatAmount, formatDateTime, formatPercent } from "../utils/format";
import { SectionHeader } from "./InfoTooltip";

interface CopyReadinessPanelProps {
  readiness: CopyReadiness | null;
}

const scoreItems = [
  { key: "dataCoverageScore", label: "Coverage" },
  { key: "freshnessScore", label: "Freshness" },
  { key: "activityScore", label: "Cadence" },
  { key: "liquidityScore", label: "Liquidity Fit" },
  { key: "positionSizeScore", label: "Size Fit" }
] as const;

export function CopyReadinessPanel({ readiness }: CopyReadinessPanelProps) {
  return (
    <section className="rounded-md border border-line bg-white">
      <SectionHeader
        title="Copy Readiness"
        description="Decision-support score for whether this wallet has enough fresh, regular, and size-compatible evidence to evaluate for copy trading. It does not execute trades."
        aside={readiness?.updatedAt ? `Updated ${formatDateTime(readiness.updatedAt)}` : "V3"}
      />
      <div className="grid gap-3 p-3">
        <div className="rounded-md border border-line bg-panel p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-medium uppercase text-slate-500">Readiness Score</div>
              <div className={`mt-1 text-3xl font-semibold tabular-nums ${scoreTextClass(readiness?.readinessScore ?? 0)}`}>
                {readiness ? readiness.readinessScore : 0}
              </div>
            </div>
            <div className="grid gap-1 text-right text-xs text-slate-600">
              <span>{readiness?.activityCadence.activeDays ?? 0} active days</span>
              <span>{readiness?.activityCadence.daysSinceLastTrade ?? "-"} days since trade</span>
              <span>{readiness?.activityCadence.tradesPerActiveDay ?? "0"} trades/day</span>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-200">
            <div
              className={`h-2 rounded-full ${scoreBarClass(readiness?.readinessScore ?? 0)}`}
              style={{ width: `${readiness?.readinessScore ?? 0}%` }}
            />
          </div>
          {readiness ? (
            <div className={`mt-3 rounded-md border p-2 text-xs ${statusClass(readiness.interpretation.status)}`}>
              <div className="font-semibold">{readiness.interpretation.title}</div>
              <div className="mt-1 leading-5">{readiness.interpretation.message}</div>
            </div>
          ) : null}
        </div>

        <div className="rounded-md border border-line p-3">
          <div className="text-sm font-semibold">Data Validation</div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-slate-600">
            <Metric label="Trades" value={String(readiness?.dataValidation.tradeCount ?? 0)} />
            <Metric label="Markets" value={String(readiness?.dataValidation.marketCount ?? 0)} />
            <Metric label="Positions" value={String(readiness?.dataValidation.positionCount ?? 0)} />
            <Metric label="Window" value={`${readiness?.dataValidation.syncedWindowDays ?? 0}d`} />
            <Metric label="Latest" value={formatDateOrDash(readiness?.dataValidation.latestTradeAt)} />
            <Metric label="Category" value={formatPercent(readiness?.dataValidation.categoryCoverageRatio)} />
            <Metric label="Unknown" value={String(readiness?.dataValidation.unknownCategoryMarketCount ?? 0)} />
            <Metric label="Source" value={readiness?.dataValidation.source ?? "-"} />
          </div>
          {readiness?.dataValidation.coverageNote ? (
            <div className="mt-2 rounded-md bg-panel p-2 text-xs leading-5 text-slate-600">
              {readiness.dataValidation.coverageNote}
            </div>
          ) : null}
        </div>

        <div className="rounded-md border border-line p-3">
          <div className="text-sm font-semibold">Next Checks</div>
          <div className="mt-2 grid gap-2">
            {(readiness?.interpretation.nextActions ?? ["Load a synced wallet to see copy-readiness checks."]).map((action) => (
              <div key={action} className="rounded-md border border-line bg-panel px-2 py-1.5 text-xs text-slate-600">
                {action}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {scoreItems.map((item) => {
            const value = readiness?.[item.key] ?? 0;
            return (
              <div key={item.key} className="rounded-md border border-line p-2">
                <div className="truncate text-[11px] font-medium text-slate-500">{item.label}</div>
                <div className={`mt-1 text-lg font-semibold tabular-nums ${scoreTextClass(value)}`}>{value}</div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-200">
                  <div className={`h-1.5 rounded-full ${scoreBarClass(value)}`} style={{ width: `${value}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-line">
            <div className="border-b border-line px-3 py-2 text-sm font-semibold">Warnings</div>
            <div className="grid gap-2 p-3">
              {readiness?.warnings.length ? (
                readiness.warnings.slice(0, 3).map((warning) => (
                  <div key={warning.code} className="rounded-md border border-line bg-panel p-2 text-xs">
                    <div className={`font-medium ${warning.severity === "critical" ? "text-loss" : "text-ink"}`}>
                      {warning.code.replaceAll("_", " ")}
                    </div>
                    <div className="mt-1 text-slate-600">{warning.message}</div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-slate-500">No readiness warnings loaded</div>
              )}
            </div>
          </div>

          <div className="rounded-md border border-line">
            <div className="border-b border-line px-3 py-2 text-sm font-semibold">Category Exposure</div>
            <div className="grid gap-2 p-3">
              {(readiness?.categoryExposure ?? []).slice(0, 4).map((category) => (
                <div key={category.category}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium">{category.category}</span>
                    <span className="tabular-nums text-slate-600">{formatAmount(category.volume, "usd")}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-200">
                    <div className="h-1.5 rounded-full bg-signal" style={{ width: formatPercentWidth(category.volumeShare) }} />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">{formatPercent(category.volumeShare)} · {category.tradeCount} trades</div>
                </div>
              ))}
              {readiness && readiness.categoryExposure.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">No category exposure loaded</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-line">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <div className="text-sm font-semibold">Oversized Trades</div>
            <div className="text-xs text-slate-500">
              {readiness?.oversizedTradeSummary.count ?? 0} found · ROI {formatPercent(readiness?.oversizedTradeSummary.roi)}
            </div>
          </div>
          <div className="overflow-auto">
            <table className="min-w-[700px] w-full text-left text-xs">
              <thead className="bg-panel uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Market</th>
                  <th className="px-3 py-2 font-medium">Side</th>
                  <th className="px-3 py-2 text-right font-medium">Value</th>
                  <th className="px-3 py-2 text-right font-medium">PnL</th>
                  <th className="px-3 py-2 font-medium">Methods</th>
                </tr>
              </thead>
              <tbody>
                {(readiness?.oversizedTrades ?? []).slice(0, 5).map((trade) => (
                  <tr key={trade.tradeId} className="border-t border-line">
                    <td className="max-w-[320px] px-3 py-2">
                      <div className="truncate">{trade.marketTitle ?? trade.marketId}</div>
                      <div className="text-[11px] text-slate-500">{trade.outcome}</div>
                    </td>
                    <td className="px-3 py-2 capitalize">{trade.side}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatAmount(trade.value, "usd")}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${Number(trade.realizedPnl) < 0 ? "text-loss" : "text-profit"}`}>
                      {formatAmount(trade.realizedPnl, "usd")}
                    </td>
                    <td className="px-3 py-2">{trade.methods.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {readiness && readiness.oversizedTrades.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-500">No oversized trades for current defaults</div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white px-2 py-1.5" title={label}>
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="mt-0.5 truncate font-medium text-ink">{value}</div>
    </div>
  );
}

function scoreTextClass(value: number): string {
  if (value >= 75) return "text-profit";
  if (value >= 50) return "text-signal";
  return "text-loss";
}

function scoreBarClass(value: number): string {
  if (value >= 75) return "bg-profit";
  if (value >= 50) return "bg-signal";
  return "bg-loss";
}

function formatPercentWidth(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0%";
  }
  return `${Math.max(0, Math.min(100, numeric * 100))}%`;
}

function statusClass(status: "ready" | "watch" | "avoid"): string {
  if (status === "ready") return "border-profit/40 bg-green-50 text-profit";
  if (status === "avoid") return "border-loss/40 bg-red-50 text-loss";
  return "border-signal/40 bg-blue-50 text-ink";
}

function formatDateOrDash(value?: string | null): string {
  return value ? formatDateTime(value) : "-";
}
