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
  const aside = relatedPosition ? `${trades.length}/${totalTradeCount ?? trades.length} related` : `${trades.length} loaded`;

  return (
    <div className="rounded-md border border-line bg-white">
      <SectionHeader
        title="Trade History"
        description="Backend-enriched trade rows with side, position effect, realized PnL, and result."
        aside={aside}
      />
      <div className="max-h-[360px] overflow-auto">
        <table className="min-w-[1120px] w-full text-left text-xs">
          <thead className="sticky top-0 bg-panel text-slate-500">
            <tr>
              <th className="w-[120px] px-3 py-2 font-medium">Timestamp</th>
              <th className="w-[260px] px-2 py-2 font-medium">Market</th>
              <th className="w-[90px] px-2 py-2 font-medium">Outcome</th>
              <th className="w-[64px] px-2 py-2 font-medium">Side</th>
              <th className="w-[76px] px-2 py-2 font-medium">Effect</th>
              <th className="w-[72px] px-2 py-2 font-medium">Result</th>
              <th className="w-[70px] px-2 py-2 text-right font-medium">Price</th>
              <th className="w-[80px] px-2 py-2 text-right font-medium">Size</th>
              <th className="w-[90px] px-2 py-2 text-right font-medium">Value</th>
              <th className="w-[90px] px-2 py-2 text-right font-medium">Realized</th>
              <th className="w-[120px] px-2 py-2 font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-t border-line">
                <td className="px-3 py-2 tabular-nums">{formatDateTime(trade.timestamp)}</td>
                <td className="px-2 py-2">
                  <div className="flex items-start gap-1.5">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${resultDotClass(trade.result)}`} />
                    <span className="line-clamp-2">{trade.marketTitle ?? trade.conditionId}</span>
                  </div>
                </td>
                <td className="truncate px-2 py-2">{trade.outcome}</td>
                <td className="px-2 py-2">
                  <Badge label={trade.side} tone={trade.side === "buy" ? "neutral" : "signal"} />
                </td>
                <td className="px-2 py-2">
                  <Badge label={trade.positionEffect} tone={trade.positionEffect === "close" ? "signal" : "neutral"} />
                </td>
                <td className="px-2 py-2">
                  <Badge label={trade.result} tone={resultTone(trade.result)} />
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{formatAmount(trade.price, "price")}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatAmount(trade.size, "shares")}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatAmount(trade.value, "usd")}</td>
                <td
                  className={`px-2 py-2 text-right tabular-nums ${
                    Number(trade.realizedPnl) > 0 ? "text-profit" : Number(trade.realizedPnl) < 0 ? "text-loss" : ""
                  }`}
                >
                  {formatAmount(trade.realizedPnl, "usd")}
                </td>
                <td className="truncate px-2 py-2 text-slate-500">{trade.transactionHash ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {trades.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-slate-500">
            {syncedAt ? "Synced, but Polymarket returned no trades for this wallet." : "No trades loaded"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type BadgeTone = "profit" | "loss" | "signal" | "neutral";

function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  return <span className={`rounded-md px-1.5 py-1 text-[10px] font-medium capitalize ${badgeClass(tone)}`}>{label}</span>;
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
