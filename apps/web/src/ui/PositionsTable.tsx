import type { PositionRow } from "@polyand/types";
import { formatAmount, formatDateTime } from "../utils/format";
import { SectionHeader } from "./InfoTooltip";

interface PositionsTableProps {
  positions: PositionRow[];
  syncedAt?: string | null;
  selectedPositionKey?: string | null;
  onSelectPosition?: (position: PositionRow) => void;
}

export function PositionsTable({ positions, syncedAt, selectedPositionKey, onSelectPosition }: PositionsTableProps) {
  return (
    <section className="flex min-h-[680px] min-w-0 flex-col rounded-md border border-line bg-white">
      <SectionHeader
        title="Positions"
        description="Reconstructed wallet exposure by market and outcome. Rows are ordered by latest trade activity, newest first. For closed positions this is usually the close/sell event; for open positions it is the latest buy or sell."
        aside={`${positions.length} loaded`}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-[1280px] w-full text-left text-sm">
          <thead className="sticky top-0 bg-panel text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-[32%] px-4 py-3 font-medium">Market</th>
              <th className="w-[13%] px-3 py-3 font-medium">Outcome</th>
              <th className="w-[96px] px-3 py-3 font-medium">Status</th>
              <th className="w-[128px] px-3 py-3 font-medium">Last Trade</th>
              <th className="px-3 py-3 text-right font-medium">Shares</th>
              <th className="px-3 py-3 text-right font-medium">Entry</th>
              <th className="px-3 py-3 text-right font-medium">Exit</th>
              <th className="px-3 py-3 text-right font-medium">Realized</th>
              <th className="px-3 py-3 text-right font-medium">Unrealized</th>
              <th className="px-3 py-3 text-right font-medium">Total PnL</th>
              <th className="px-3 py-3 text-right font-medium">Conf</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => {
              const key = `${position.marketId}:${position.outcome}`;
              const selected = selectedPositionKey === key;

              return (
              <tr
                key={position.id}
                className={`cursor-pointer border-t border-line align-top hover:bg-panel ${
                  selected ? "bg-blue-50 ring-1 ring-inset ring-signal" : ""
                }`}
                onClick={() => onSelectPosition?.(position)}
                title="Show related trades"
              >
                <td className="max-w-[520px] px-4 py-3 leading-5">
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${Number(position.totalPnl) >= 0 ? "bg-profit" : "bg-loss"}`} />
                    <span>{position.marketTitle ?? position.marketId}</span>
                  </div>
                </td>
                <td className="px-3 py-3 leading-5">{position.outcome}</td>
                <td className="px-3 py-3">
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      Number(position.currentShares) > 0 ? "bg-blue-50 text-signal" : "bg-panel text-slate-600"
                    }`}
                  >
                    {Number(position.currentShares) > 0 ? "Open" : "Closed"}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs tabular-nums text-slate-600">{formatDateTime(position.lastTradeAt)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatAmount(position.currentShares, "shares")}</td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatAmount(position.averageEntryPrice, "price")}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatAmount(position.averageExitPrice, "price")}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{formatAmount(position.realizedPnl, "usd")}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatAmount(position.unrealizedPnl, "usd")}</td>
                <td
                  className={`px-3 py-3 text-right font-medium tabular-nums ${
                    Number(position.totalPnl) >= 0 ? "text-profit" : "text-loss"
                  }`}
                >
                  {formatAmount(position.totalPnl, "usd")}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{position.confidenceScore}</td>
              </tr>
            );
            })}
          </tbody>
        </table>
        {positions.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            {syncedAt ? "Synced, but no positions could be reconstructed." : "No positions loaded"}
          </div>
        ) : null}
      </div>
    </section>
  );
}
