import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Play, Wand2 } from "lucide-react";
import type { CopySimulationAction, CopySimulationRecord, CopySizingSuggestion } from "@polyand/types";
import { api, type CopySimulationRequest } from "../api/client";
import { formatAmount, formatDateTime, formatPercent } from "../utils/format";
import { SectionHeader } from "./InfoTooltip";

interface CopySimulatorPanelProps {
  address: string;
  showHeader?: boolean;
  embedded?: boolean;
}

interface SimulatorFormState {
  startingBalance: string;
  copyPercentage: string;
  fixedCopyAmount: string;
  maxPositionSize: string;
  minPositionSize: string;
  maxMarketExposure: string;
  maxTotalExposure: string;
  delaySeconds: string;
  allowedActions: CopySimulationAction[];
  includeCategories: string;
  excludeCategories: string;
  includeUnresolvedMarkets: boolean;
  liquidityFilterEnabled: boolean;
  excludeOversizedTrades: boolean;
  drawdownStopPercent: string;
}

const defaultForm: SimulatorFormState = {
  startingBalance: "1000",
  copyPercentage: "10",
  fixedCopyAmount: "",
  maxPositionSize: "",
  minPositionSize: "5",
  maxMarketExposure: "",
  maxTotalExposure: "",
  delaySeconds: "0",
  allowedActions: ["entry", "add", "reduce", "close"],
  includeCategories: "",
  excludeCategories: "",
  includeUnresolvedMarkets: true,
  liquidityFilterEnabled: false,
  excludeOversizedTrades: false,
  drawdownStopPercent: ""
};

const delayOptions = [
  { value: "0", label: "Instant" },
  { value: "60", label: "1 minute" },
  { value: "300", label: "5 minutes" },
  { value: "900", label: "15 minutes" },
  { value: "3600", label: "1 hour" }
];

const actionOptions: Array<{ value: CopySimulationAction; label: string }> = [
  { value: "entry", label: "Entries" },
  { value: "add", label: "Adds" },
  { value: "reduce", label: "Reduces" },
  { value: "close", label: "Closes" }
];

export function CopySimulatorPanel({ address, showHeader = true, embedded = false }: CopySimulatorPanelProps) {
  const [form, setForm] = useState<SimulatorFormState>(defaultForm);
  const [record, setRecord] = useState<CopySimulationRecord | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<CopySizingSuggestion | null>(null);

  useEffect(() => {
    setSuggestion(null);
    if (!address) {
      return;
    }
    let active = true;
    api
      .getCopySizingSuggestion(address)
      .then((result) => {
        if (active) {
          setSuggestion(result);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [address]);

  const applySuggestion = () => {
    if (!suggestion) {
      return;
    }
    setForm((current) => ({
      ...current,
      copyPercentage: String(Number(suggestion.recommendedCopyPercentage) * 100),
      minPositionSize: suggestion.recommendedMinPositionSize,
      fixedCopyAmount: ""
    }));
  };

  const update = <K extends keyof SimulatorFormState>(key: K, value: SimulatorFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleAction = (action: CopySimulationAction) =>
    setForm((current) => ({
      ...current,
      allowedActions: current.allowedActions.includes(action)
        ? current.allowedActions.filter((value) => value !== action)
        : [...current.allowedActions, action]
    }));

  const runSimulation = async () => {
    if (!address) {
      setError("Load a wallet before running a copy simulation.");
      return;
    }
    if (form.allowedActions.length === 0) {
      setError("Select at least one trader action to copy.");
      return;
    }

    setRunning(true);
    setError(null);
    try {
      setRecord(await api.runCopySimulation(address, buildRequest(form)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Simulation failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className={embedded ? "bg-white" : "rounded-md border border-line bg-white"}>
      {showHeader ? (
        <SectionHeader
          title="Copy Trading Simulator"
          description="Replays the wallet's stored trade history as if you had manually copied it with these settings. This is a historical what-if tool; it never places orders or touches funds."
          aside="V4"
        />
      ) : null}

      <div className="grid gap-4 p-4">
        {suggestion && suggestion.tradeCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-panel px-3 py-2 text-xs text-slate-600">
            <span>
              This wallet's typical trade is{" "}
              <span className="font-semibold text-ink">{formatAmount(suggestion.medianTradeValue, "usd")}</span> (median).
              Recommended: copy {formatPercent(suggestion.recommendedCopyPercentage)}, min{" "}
              {formatAmount(suggestion.recommendedMinPositionSize, "usd")} per position.
            </span>
            <button
              type="button"
              onClick={applySuggestion}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 font-medium text-ink"
            >
              <Wand2 size={14} />
              Use recommended settings
            </button>
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <FormField label="Starting balance ($)">
            <NumberInput value={form.startingBalance} onChange={(value) => update("startingBalance", value)} />
          </FormField>
          <FormField label="Copy percentage (%)">
            <NumberInput value={form.copyPercentage} onChange={(value) => update("copyPercentage", value)} />
          </FormField>
          <FormField label="Fixed copy amount ($, overrides %)">
            <NumberInput value={form.fixedCopyAmount} onChange={(value) => update("fixedCopyAmount", value)} placeholder="Optional" />
          </FormField>
          <FormField label="Delay before copying">
            <select
              value={form.delaySeconds}
              onChange={(event) => update("delaySeconds", event.target.value)}
              className="h-9 w-full rounded-md border border-line bg-white px-2 text-sm"
            >
              {delayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Min position size ($)">
            <NumberInput value={form.minPositionSize} onChange={(value) => update("minPositionSize", value)} />
          </FormField>
          <FormField label="Max position size ($)">
            <NumberInput value={form.maxPositionSize} onChange={(value) => update("maxPositionSize", value)} placeholder="Unlimited" />
          </FormField>
          <FormField label="Max market exposure ($)">
            <NumberInput value={form.maxMarketExposure} onChange={(value) => update("maxMarketExposure", value)} placeholder="Unlimited" />
          </FormField>
          <FormField label="Max total open exposure ($)">
            <NumberInput value={form.maxTotalExposure} onChange={(value) => update("maxTotalExposure", value)} placeholder="Unlimited" />
          </FormField>
          <FormField label="Include categories (comma separated)">
            <TextInput value={form.includeCategories} onChange={(value) => update("includeCategories", value)} placeholder="All categories" />
          </FormField>
          <FormField label="Exclude categories (comma separated)">
            <TextInput value={form.excludeCategories} onChange={(value) => update("excludeCategories", value)} placeholder="None" />
          </FormField>
          <FormField label="Stop after drawdown (%)">
            <NumberInput value={form.drawdownStopPercent} onChange={(value) => update("drawdownStopPercent", value)} placeholder="Disabled" />
          </FormField>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Copy actions</span>
          {actionOptions.map((option) => (
            <Checkbox
              key={option.value}
              label={option.label}
              checked={form.allowedActions.includes(option.value)}
              onChange={() => toggleAction(option.value)}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Checkbox
            label="Include unresolved markets"
            checked={form.includeUnresolvedMarkets}
            onChange={() => update("includeUnresolvedMarkets", !form.includeUnresolvedMarkets)}
          />
          <Checkbox
            label="Liquidity filter (skip copies larger than the observed trade)"
            checked={form.liquidityFilterEnabled}
            onChange={() => update("liquidityFilterEnabled", !form.liquidityFilterEnabled)}
          />
          <Checkbox
            label="Skip oversized trades"
            checked={form.excludeOversizedTrades}
            onChange={() => update("excludeOversizedTrades", !form.excludeOversizedTrades)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void runSimulation()}
            disabled={running}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            <Play size={15} />
            {running ? "Running simulation..." : "Run simulation"}
          </button>
          {error ? <span className="text-sm font-medium text-loss">{error}</span> : null}
        </div>

        {record ? <CopySimulationResults record={record} /> : null}
      </div>
    </section>
  );
}

export function CopySimulationResults({ record }: { record: CopySimulationRecord }) {
  const { summary, equityCurve, ledger, missedTrades, categoryBreakdown, delaySensitivity } = record.result;
  const equityOption = {
    animation: false,
    grid: { left: 68, right: 24, top: 24, bottom: 36 },
    tooltip: { trigger: "axis", valueFormatter: (value: number) => formatAmount(value, "usd") },
    xAxis: { type: "category", data: equityCurve.map((point) => point.date), axisLabel: { fontSize: 11 } },
    yAxis: {
      type: "value",
      scale: true,
      axisLabel: { fontSize: 11, formatter: (value: number) => formatAmount(value, "usd") }
    },
    series: [
      {
        name: "Equity",
        type: "line",
        data: equityCurve.map((point) => Number(point.equity)),
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#11845b", width: 2 },
        areaStyle: { color: "rgba(17, 132, 91, 0.08)" }
      }
    ]
  };

  return (
    <div className="grid gap-4 border-t border-line pt-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">Simulation result</h3>
        <span className="text-xs text-slate-500">Run {formatDateTime(record.createdAt)}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Ending equity" value={formatAmount(summary.endingEquity, "usd")} />
        <SummaryCard
          label="Total PnL / ROI"
          value={`${formatAmount(summary.totalPnl, "usd")} (${formatPercent(summary.roi)})`}
          tone={Number(summary.totalPnl) >= 0 ? "gain" : "loss"}
        />
        <SummaryCard label="Winrate (closed copies)" value={formatPercent(summary.winrate)} />
        <SummaryCard
          label="Max drawdown"
          value={`${formatAmount(summary.maxDrawdown, "usd")} (${formatPercent(summary.maxDrawdownPercent)})`}
          tone={Number(summary.maxDrawdown) > 0 ? "loss" : undefined}
        />
        <SummaryCard label="Copied trades" value={String(summary.copiedTradeCount)} />
        <SummaryCard label="Missed trades" value={String(summary.missedTradeCount)} />
        <SummaryCard label="Ending cash" value={formatAmount(summary.endingCash, "usd")} />
        <SummaryCard label="Open position value" value={formatAmount(summary.openPositionValue, "usd")} />
      </div>

      {summary.copiedTradeCount === 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {emptyStateMessage(summary)}
        </div>
      ) : null}

      {summary.drawdownStopTriggered ? (
        <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-slate-700">
          The drawdown stop was triggered during this replay, so later entries were skipped.
        </div>
      ) : null}

      <div className="rounded-md border border-line">
        <div className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Equity curve (realized basis)
        </div>
        <div className="h-[260px]">
          <ReactECharts option={equityOption} style={{ height: "260px", width: "100%" }} />
        </div>
      </div>

      <div className="rounded-md border border-line bg-panel px-3 py-2 text-xs leading-5 text-slate-600">
        <span className="font-semibold text-slate-700">How fills are priced:</span> {describeFills(summary.fillMethodCounts)}{" "}
        Delayed fills use the real market midpoint from CLOB price history when available, otherwise a modeled
        slippage estimate. The scenarios below show whole-portfolio outcomes at each delay; their granularity
        reflects available price history, not a continuous curve.
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ResultTable
          title="Delay scenarios"
          headers={["Delay", "ROI", "Total PnL", "Copied", "Missed"]}
          rows={delaySensitivity.map((point) => [
            formatDelay(point.delaySeconds),
            formatPercent(point.roi),
            formatAmount(point.totalPnl, "usd"),
            String(point.copiedTradeCount),
            String(point.missedTradeCount)
          ])}
        />
        <ResultTable
          title="Category breakdown"
          headers={["Category", "Copied", "Missed", "Volume", "Realized PnL"]}
          rows={categoryBreakdown.map((category) => [
            category.category,
            String(category.copiedTradeCount),
            String(category.missedTradeCount),
            formatAmount(category.volume, "usd"),
            formatAmount(category.realizedPnl, "usd")
          ])}
        />
      </div>

      <ResultTable
        title={`Simulated trades (${ledger.length})`}
        headers={["Executed", "Market", "Outcome", "Action", "Price", "Fill", "Shares", "Value", "Realized PnL", "Cash after"]}
        rows={ledger.map((row) => [
          formatDateTime(row.executedAt),
          row.marketTitle ?? row.marketId,
          row.outcome,
          row.action,
          formatAmount(row.executionPrice, "price"),
          fillMethodLabel[row.fillMethod] ?? row.fillMethod,
          formatAmount(row.shares, "shares"),
          formatAmount(row.value, "usd"),
          formatAmount(row.realizedPnl, "usd"),
          formatAmount(row.cashAfter, "usd")
        ])}
      />

      <ResultTable
        title={`Missed trades (${missedTrades.length})`}
        headers={["Time", "Market", "Outcome", "Action", "Reason", "Detail"]}
        rows={missedTrades.map((row) => [
          formatDateTime(row.timestamp),
          row.marketTitle ?? row.marketId,
          row.outcome,
          row.action,
          row.reason,
          row.detail
        ])}
      />
    </div>
  );
}

function buildRequest(form: SimulatorFormState): CopySimulationRequest {
  return {
    startingBalance: Number(form.startingBalance),
    copyPercentage: Number(form.copyPercentage) / 100,
    fixedCopyAmount: optionalNumber(form.fixedCopyAmount),
    maxPositionSize: optionalNumber(form.maxPositionSize),
    minPositionSize: Number(form.minPositionSize),
    maxMarketExposure: optionalNumber(form.maxMarketExposure),
    maxTotalExposure: optionalNumber(form.maxTotalExposure),
    delaySeconds: Number(form.delaySeconds),
    allowedActions: form.allowedActions,
    includeCategories: parseCategories(form.includeCategories),
    excludeCategories: parseCategories(form.excludeCategories),
    includeUnresolvedMarkets: form.includeUnresolvedMarkets,
    liquidityFilterEnabled: form.liquidityFilterEnabled,
    excludeOversizedTrades: form.excludeOversizedTrades,
    drawdownStopPercent: form.drawdownStopPercent === "" ? null : Number(form.drawdownStopPercent) / 100
  };
}

function optionalNumber(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function parseCategories(value: string): string[] {
  return value
    .split(",")
    .map((category) => category.trim())
    .filter((category) => category.length > 0);
}

function emptyStateMessage(summary: CopySimulationRecord["result"]["summary"]): string {
  // The dominant blocking reason explains why no buys were copied. NOTHING_TO_REDUCE
  // is a downstream effect of skipped buys, so it's not treated as the root cause.
  const blocking = Object.entries(summary.missedReasonCounts)
    .filter(([reason]) => reason !== "NOTHING_TO_REDUCE")
    .sort((a, b) => b[1] - a[1]);
  const top = blocking[0]?.[0] ?? Object.keys(summary.missedReasonCounts)[0];

  switch (top) {
    case "BELOW_MIN_SIZE":
      return "No trades matched: every copy came out below your minimum position size. This wallet's trades are small — lower the minimum or raise the copy percentage (try 'Use recommended settings').";
    case "INSUFFICIENT_BALANCE":
      return "No trades matched: the starting balance ran out before any position cleared the minimum. Raise the starting balance or lower the copy size.";
    case "MAX_TOTAL_EXPOSURE":
    case "MAX_MARKET_EXPOSURE":
    case "MAX_POSITION_SIZE":
      return "No trades matched: your exposure limits blocked every buy. Raise the position/market/total exposure caps.";
    case "CATEGORY_EXCLUDED":
      return "No trades matched: every trade was outside your category filters. Adjust the include/exclude categories.";
    case "OVERSIZED_TRADE":
      return "No trades matched: every trade was filtered out as oversized. Disable the oversized filter or loosen its thresholds.";
    case "LIQUIDITY_FILTERED":
      return "No trades matched: the liquidity filter skipped every copy as too large to fill. Disable it or lower the copy size.";
    case "UNRESOLVED_MARKET_EXCLUDED":
      return "No trades matched: every trade was in an unresolved market, which you excluded. Enable unresolved markets.";
    case "DRAWDOWN_STOP":
      return "No trades matched: the drawdown stop halted copying. Raise the drawdown threshold.";
    default:
      return "No trades matched your current settings. Try 'Use recommended settings' or loosen the filters.";
  }
}

const fillMethodLabel: Record<string, string> = {
  actual: "at trade price",
  history: "real price history",
  slippage: "modeled estimate"
};

function describeFills(counts: Record<string, number>): string {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return "No fills were executed.";
  }
  const parts = (["history", "actual", "slippage"] as const)
    .filter((method) => counts[method])
    .map((method) => `${Math.round(((counts[method] ?? 0) / total) * 100)}% ${fillMethodLabel[method]}`);
  return `${parts.join(", ")}.`;
}

function formatDelay(delaySeconds: number): string {
  if (delaySeconds === 0) {
    return "Instant";
  }
  if (delaySeconds < 3600) {
    return `${Math.round(delaySeconds / 60)}m`;
  }
  return `${Math.round(delaySeconds / 3600)}h`;
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-600">
      {label}
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      min={0}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-9 w-full rounded-md border border-line bg-white px-2 text-sm font-normal text-ink outline-none focus:border-signal"
    />
  );
}

function TextInput({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-9 w-full rounded-md border border-line bg-white px-2 text-sm font-normal text-ink outline-none focus:border-signal"
    />
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-line" />
      {label}
    </label>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "gain" | "loss" }) {
  return (
    <div className="rounded-md border border-line bg-panel px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${tone === "gain" ? "text-profit" : tone === "loss" ? "text-loss" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function ResultTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-md border border-line">
      <div className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="max-h-[320px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-panel text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-3 py-2 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-3 py-4 text-center text-slate-500">
                  No rows
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className="border-t border-line align-top">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
