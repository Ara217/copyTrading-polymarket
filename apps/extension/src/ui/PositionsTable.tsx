import type { PositionRow } from "@polyand/types";
import { formatAmount } from "../utils/format";

interface PositionsTableProps {
  positions: PositionRow[];
  syncedAt?: string | null;
}

export function PositionsTable({ positions, syncedAt }: PositionsTableProps) {
  return (
    <aside className="min-w-0 rounded-md border border-line bg-white">
      <div className="border-b border-line px-3 py-2 text-sm font-semibold">Positions</div>
      <div className="max-h-[326px] overflow-auto">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="sticky top-0 bg-panel text-slate-500">
            <tr>
              <th className="w-[45%] px-3 py-2 font-medium">Market</th>
              <th className="w-[18%] px-2 py-2 font-medium">Outcome</th>
              <th className="w-[20%] px-2 py-2 text-right font-medium">PnL</th>
              <th className="w-[17%] px-2 py-2 text-right font-medium">Conf</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.id} className="border-t border-line">
                <td className="truncate px-3 py-2">{position.marketTitle ?? position.marketId}</td>
                <td className="truncate px-2 py-2">{position.outcome}</td>
                <td
                  className={`px-2 py-2 text-right tabular-nums ${
                    Number(position.totalPnl) >= 0 ? "text-profit" : "text-loss"
                  }`}
                >
                  {formatAmount(position.totalPnl, "usd")}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{position.confidenceScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {positions.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-slate-500">
            {syncedAt ? "Synced, but no positions could be reconstructed." : "No positions loaded"}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
