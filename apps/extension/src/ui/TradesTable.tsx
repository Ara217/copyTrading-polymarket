import type { TradeRow } from "@polyand/types";
import { formatAmount, formatDateTime } from "../utils/format";

interface TradesTableProps {
  trades: TradeRow[];
  syncedAt?: string | null;
}

export function TradesTable({ trades, syncedAt }: TradesTableProps) {
  return (
    <div className="rounded-md border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-sm font-semibold">Trade History</span>
        <span className="text-xs text-slate-500">{trades.length} loaded</span>
      </div>
      <div className="max-h-[360px] overflow-auto">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="sticky top-0 bg-panel text-slate-500">
            <tr>
              <th className="w-[120px] px-3 py-2 font-medium">Timestamp</th>
              <th className="px-2 py-2 font-medium">Market</th>
              <th className="w-[90px] px-2 py-2 font-medium">Outcome</th>
              <th className="w-[70px] px-2 py-2 text-right font-medium">Price</th>
              <th className="w-[80px] px-2 py-2 text-right font-medium">Size</th>
              <th className="w-[90px] px-2 py-2 text-right font-medium">Value</th>
              <th className="w-[120px] px-2 py-2 font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-t border-line">
                <td className="px-3 py-2 tabular-nums">{formatDateTime(trade.timestamp)}</td>
                <td className="truncate px-2 py-2">{trade.marketTitle ?? trade.conditionId}</td>
                <td className="truncate px-2 py-2">{trade.outcome}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatAmount(trade.price, "price")}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatAmount(trade.size, "shares")}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatAmount(trade.value, "usd")}</td>
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
