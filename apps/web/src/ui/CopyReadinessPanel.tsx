import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { CopyReadiness } from "@polyand/types";
import { formatAmount, formatDateTime, formatPercent } from "../utils/format";
import { SectionHeader } from "./InfoTooltip";

interface CopyReadinessPanelProps {
  readiness: CopyReadiness | null;
  showHeader?: boolean;
  embedded?: boolean;
}

const scoreItems = [
  {
    key: "dataCoverageScore",
    label: "Coverage",
    description: "How much public wallet history is available across trades and markets."
  },
  {
    key: "freshnessScore",
    label: "Freshness",
    description: "How recently the wallet traded. Fresh wallets are better copy candidates."
  },
  {
    key: "activityScore",
    label: "Cadence",
    description: "How regularly the wallet trades across observed active days."
  },
  {
    key: "liquidityScore",
    label: "Liquidity Fit",
    description: "How many observed trades fit the configured max copy position size."
  },
  {
    key: "positionSizeScore",
    label: "Size Fit",
    description: "How compatible reconstructed position sizes are with copy constraints."
  }
] as const;

export function CopyReadinessPanel({ readiness, showHeader = true, embedded = false }: CopyReadinessPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    validation: false,
    scores: true,
    exposure: true,
    oversized: true
  });
  const toggle = (section: string) => setCollapsed((current) => ({ ...current, [section]: !current[section] }));

  return (
    <section className={embedded ? "bg-white" : "rounded-md border border-line bg-white"}>
      {showHeader ? (
        <SectionHeader
          title="Copy Readiness"
          description="Decision-support score for whether this wallet has enough fresh, regular, and size-compatible evidence to evaluate for copy trading. It does not execute trades."
          aside={readiness?.updatedAt ? `Updated ${formatDateTime(readiness.updatedAt)}` : "V3"}
        />
      ) : null}
      <div className="grid gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-md border border-line bg-panel p-4">
          <div className="text-xs font-medium uppercase text-slate-500">Readiness Score</div>
          <div className={`mt-2 text-4xl font-semibold tabular-nums ${scoreTextClass(readiness?.readinessScore ?? 0)}`}>
            {readiness ? readiness.readinessScore : 0}
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-200">
            <div
              className={`h-2 rounded-full ${scoreBarClass(readiness?.readinessScore ?? 0)}`}
              style={{ width: `${readiness?.readinessScore ?? 0}%` }}
            />
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-600">
            <div>Active days: {readiness?.activityCadence.activeDays ?? 0}</div>
            <div>Observed days: {readiness?.activityCadence.observedDays ?? 0}</div>
            <div>Trades/active day: {readiness?.activityCadence.tradesPerActiveDay ?? "0"}</div>
            <div>Days since trade: {readiness?.activityCadence.daysSinceLastTrade ?? "-"}</div>
          </div>
          {readiness ? (
            <div className={`mt-4 rounded-md border p-3 text-sm ${statusClass(readiness.interpretation.status)}`}>
              <div className="font-semibold">{readiness.interpretation.title}</div>
              <div className="mt-1 leading-5">{readiness.interpretation.message}</div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          <ReadinessSection
            title="Data Validation"
            summary={`${readiness?.dataValidation.tradeCount ?? 0} trades · ${readiness?.dataValidation.marketCount ?? 0} markets · ${readiness?.dataValidation.syncedWindowDays ?? 0} days`}
            collapsed={collapsed.validation}
            onToggle={() => toggle("validation")}
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-md border border-line p-3">
                <div className="mt-1 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <Metric label="Trades synced" value={String(readiness?.dataValidation.tradeCount ?? 0)} />
                  <Metric label="Markets synced" value={String(readiness?.dataValidation.marketCount ?? 0)} />
                  <Metric label="Positions built" value={String(readiness?.dataValidation.positionCount ?? 0)} />
                  <Metric label="History window" value={`${readiness?.dataValidation.syncedWindowDays ?? 0} days`} />
                  <Metric label="Oldest trade" value={formatDateOrDash(readiness?.dataValidation.oldestTradeAt)} />
                  <Metric label="Latest trade" value={formatDateOrDash(readiness?.dataValidation.latestTradeAt)} />
                  <Metric label="Category coverage" value={formatPercent(readiness?.dataValidation.categoryCoverageRatio)} />
                  <Metric label="Source" value={readiness?.dataValidation.source ?? "-"} />
                </div>
                {readiness?.dataValidation.coverageNote ? (
                  <div className="mt-3 rounded-md bg-panel p-3 text-sm leading-5 text-slate-600" title="Compares our stored wallet sample against the public Polymarket adapter window available to this app.">
                    {readiness.dataValidation.coverageNote}
                  </div>
                ) : null}
              </div>

              <div className="rounded-md border border-line p-3">
                <div className="text-sm font-semibold">Next Checks</div>
                <div className="mt-3 grid gap-2">
                  {(readiness?.interpretation.nextActions ?? ["Load a synced wallet to see copy-readiness checks."]).map((action) => (
                    <div key={action} className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-slate-600">
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ReadinessSection>

          <ReadinessSection
            title="Score Breakdown"
            summary={`${readiness?.dataCoverageScore ?? 0} coverage · ${readiness?.freshnessScore ?? 0} freshness · ${readiness?.positionSizeScore ?? 0} size fit`}
            collapsed={collapsed.scores}
            onToggle={() => toggle("scores")}
          >
            <div className="grid gap-3 md:grid-cols-5">
              {scoreItems.map((item) => {
                const value = readiness?.[item.key] ?? 0;
                return (
                  <div key={item.key} className="rounded-md border border-line p-3">
                    <div className="text-xs font-medium text-slate-500" title={item.description}>
                      {item.label}
                    </div>
                    <div className={`mt-2 text-xl font-semibold tabular-nums ${scoreTextClass(value)}`}>{value}</div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                      <div className={`h-1.5 rounded-full ${scoreBarClass(value)}`} style={{ width: `${value}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ReadinessSection>

          <ReadinessSection
            title="Warnings And Category Exposure"
            summary={`${readiness?.warnings.length ?? 0} warnings · ${(readiness?.categoryExposure ?? [])[0]?.category ?? "no category"} top category`}
            collapsed={collapsed.exposure}
            onToggle={() => toggle("exposure")}
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-md border border-line">
                <div className="border-b border-line px-3 py-2 text-sm font-semibold">Warnings</div>
                <div className="grid gap-2 p-3">
                  {readiness?.warnings.length ? (
                    readiness.warnings.map((warning) => (
                      <div key={warning.code} className="rounded-md border border-line bg-panel p-3 text-sm">
                        <div className={`font-medium ${warning.severity === "critical" ? "text-loss" : "text-ink"}`}>
                          {warning.code.replaceAll("_", " ")}
                        </div>
                        <div className="mt-1 text-slate-600">{warning.message}</div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-sm text-slate-500">No readiness warnings loaded</div>
                  )}
                </div>
              </div>

              <div className="rounded-md border border-line">
                <div className="border-b border-line px-3 py-2 text-sm font-semibold">Category Exposure</div>
                <div className="grid gap-3 p-3">
                  {(readiness?.categoryExposure ?? []).slice(0, 6).map((category) => (
                    <div key={category.category}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{category.category}</span>
                        <span className="tabular-nums text-slate-600">{formatAmount(category.volume, "usd")}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-200">
                        <div className="h-1.5 rounded-full bg-signal" style={{ width: formatPercentWidth(category.volumeShare) }} />
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatPercent(category.volumeShare)} volume · {category.tradeCount} trades · {category.marketCount} markets
                      </div>
                    </div>
                  ))}
                  {readiness && readiness.categoryExposure.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-500">No category exposure loaded</div>
                  ) : null}
                </div>
              </div>
            </div>
          </ReadinessSection>

          <ReadinessSection
            title="Oversized Trades"
            summary={`${readiness?.oversizedTradeSummary.count ?? 0} found · ROI ${formatPercent(readiness?.oversizedTradeSummary.roi)}`}
            collapsed={collapsed.oversized}
            onToggle={() => toggle("oversized")}
          >
            <div className="rounded-md border border-line">
              <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
                <div className="text-sm font-semibold">Oversized Trades</div>
                <div className="text-xs text-slate-500">
                  {readiness?.oversizedTradeSummary.count ?? 0} found · ROI {formatPercent(readiness?.oversizedTradeSummary.roi)}
                </div>
              </div>
              <div className="overflow-auto">
                <table className="min-w-[920px] w-full text-left text-sm">
                  <thead className="bg-panel text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Market</th>
                      <th className="px-3 py-2 font-medium">Side</th>
                      <th className="px-3 py-2 text-right font-medium">Value</th>
                      <th className="px-3 py-2 text-right font-medium">PnL</th>
                      <th className="px-3 py-2 font-medium">Methods</th>
                      <th className="px-3 py-2 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(readiness?.oversizedTrades ?? []).slice(0, 8).map((trade) => (
                      <tr key={trade.tradeId} className="border-t border-line">
                        <td className="max-w-[420px] px-3 py-2">
                          <div className="truncate">{trade.marketTitle ?? trade.marketId}</div>
                          <div className="text-xs text-slate-500">{trade.outcome}</div>
                        </td>
                        <td className="px-3 py-2 capitalize">{trade.side}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatAmount(trade.value, "usd")}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${Number(trade.realizedPnl) < 0 ? "text-loss" : "text-profit"}`}>
                          {formatAmount(trade.realizedPnl, "usd")}
                        </td>
                        <td className="px-3 py-2 text-xs">{trade.methods.join(", ")}</td>
                        <td className="px-3 py-2 capitalize">{trade.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {readiness && readiness.oversizedTrades.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-slate-500">No oversized trades for current defaults</div>
                ) : null}
              </div>
            </div>
          </ReadinessSection>
        </div>
      </div>
    </section>
  );
}

function ReadinessSection({
  title,
  summary,
  collapsed,
  onToggle,
  children
}: {
  title: string;
  summary: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-line">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
        aria-expanded={!collapsed}
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">{title}</div>
          <div className="mt-0.5 truncate text-xs text-slate-500">{summary}</div>
        </div>
        <ChevronDown className={`shrink-0 text-slate-500 transition-transform ${collapsed ? "-rotate-90" : ""}`} size={17} />
      </button>
      {collapsed ? null : <div className="border-t border-line p-3">{children}</div>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white px-3 py-2" title={label}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 truncate font-medium text-ink">{value}</div>
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
