import type { PositionRow, TradeRow } from "@polyand/types";
import { formatAmount, formatDateTime } from "../utils/format";
import { SectionHeader } from "./InfoTooltip";

interface TradesTableProps {
  trades: TradeRow[];
  syncedAt?: string | null;
  relatedPosition?: PositionRow | null;
  totalTradeCount?: number;
}

export function TradesTable({
  trades,
  syncedAt,
  relatedPosition,
  totalTradeCount
}: TradesTableProps) {
  const aside = relatedPosition
    ? `${trades.length} related of ${totalTradeCount ?? trades.length}`
    : `${trades.length} loaded, API limit 500`;

  return (
    <section className="flex min-h-[520px] min-w-0 flex-col rounded-md border border-line bg-white">
      <SectionHeader
        title="Trade History"
        description="Normalized trade rows enriched by the backend with side, position effect, realized PnL, and result. Buy rows stay Open until a sell closes or reduces the position."
        aside={aside}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-[1260px] w-full text-left text-sm">
          <thead className="sticky top-0 bg-panel text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-[150px] px-4 py-3 font-medium">Timestamp</th>
              <th className="w-[28%] px-3 py-3 font-medium">Market</th>
              <th className="w-[140px] px-3 py-3 font-medium">Outcome</th>
              <th className="w-[80px] px-3 py-3 font-medium">Side</th>
              <th className="w-[96px] px-3 py-3 font-medium">Effect</th>
              <th className="w-[92px] px-3 py-3 font-medium">Result</th>
              <th className="px-3 py-3 text-right font-medium">Price</th>
              <th className="px-3 py-3 text-right font-medium">Size</th>
              <th className="px-3 py-3 text-right font-medium">Value</th>
              <th className="px-3 py-3 text-right font-medium">Realized</th>
              <th className="px-3 py-3 text-right font-medium">Remain</th>
              <th className="w-[160px] px-3 py-3 font-medium">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-t border-line align-top">
                <td className="px-4 py-3 tabular-nums">{formatDateTime(trade.timestamp)}</td>
                <td className="max-w-[520px] px-3 py-3 leading-5">
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${resultDotClass(trade.result)}`} />
                    <span>{trade.marketTitle ?? trade.conditionId}</span>
                  </div>
                </td>
                <td className="px-3 py-3 leading-5">{trade.outcome}</td>
                <td className="px-3 py-3">
                  <Badge label={trade.side.toUpperCase()} tone={trade.side === "buy" ? "neutral" : "signal"} />
                </td>
                <td className="px-3 py-3">
                  <Badge label={trade.positionEffect} tone={trade.positionEffect === "close" ? "signal" : "neutral"} />
                </td>
                <td className="px-3 py-3">
                  <Badge label={trade.result} tone={resultTone(trade.result)} />
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{formatAmount(trade.price, "price")}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatAmount(trade.size, "shares")}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatAmount(trade.value, "usd")}</td>
                <td
                  className={`px-3 py-3 text-right tabular-nums ${
                    Number(trade.realizedPnl) > 0 ? "text-profit" : Number(trade.realizedPnl) < 0 ? "text-loss" : ""
                  }`}
                >
                  {formatAmount(trade.realizedPnl, "usd")}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{formatAmount(trade.remainingShares, "shares")}</td>
                <td className="break-all px-3 py-3 font-mono text-xs text-slate-600">{trade.transactionHash ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {trades.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            {syncedAt ? "Synced, but Polymarket returned no trades for this wallet." : "No trades loaded"}
          </div>
        ) : null}
      </div>
    </section>
  );
}

type BadgeTone = "profit" | "loss" | "signal" | "neutral";

function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span className={`rounded-md px-2 py-1 text-xs font-medium capitalize ${badgeClass(tone)}`}>
      {label}
    </span>
  );
}

function resultTone(result: TradeRow["result"]): BadgeTone {
  if (result === "win") return "profit";
  if (result === "loss") return "loss";
  if (result === "open") return "signal";
  return "neutral";
}

function resultDotClass(result: TradeRow["result"]): string {
  if (result === "win") return "bg-profit";
  if (result === "loss") return "bg-loss";
  if (result === "open") return "bg-signal";
  return "bg-slate-300";
}

function badgeClass(tone: BadgeTone): string {
  if (tone === "profit") return "bg-green-50 text-profit";
  if (tone === "loss") return "bg-red-50 text-loss";
  if (tone === "signal") return "bg-blue-50 text-signal";
  return "bg-panel text-slate-600";
}
