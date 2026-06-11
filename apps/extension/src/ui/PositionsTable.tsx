import { ExternalLink } from "lucide-react";
import type { PositionRow } from "@polyand/types";
import { formatAmount, formatDate } from "../utils/format";
import { SectionHeader } from "./InfoTooltip";

interface PositionsTableProps {
  positions: PositionRow[];
  syncedAt?: string | null;
  selectedPositionKey?: string | null;
  onSelectPosition?: (position: PositionRow) => void;
}

export function PositionsTable({ positions, syncedAt, selectedPositionKey, onSelectPosition }: PositionsTableProps) {
  return (
    <aside className="min-w-0 rounded-md border border-line bg-white">
      <SectionHeader
        title="Positions"
        description="Reconstructed exposure by market and outcome. Bet is buy notional, Current is marked value of open shares, and Sold is actual sell proceeds."
        aside={`${positions.length} loaded`}
      />
      <div className="max-h-[676px] overflow-auto">
        <table className="min-w-[980px] w-full text-left text-xs">
          <thead className="sticky top-0 bg-panel text-slate-500">
            <tr>
              <th className="w-[30%] px-3 py-2 font-medium">Market</th>
              <th className="w-[12%] px-2 py-2 font-medium">Outcome</th>
              <th className="w-[80px] px-2 py-2 font-medium">Status</th>
              <th className="w-[92px] px-2 py-2 font-medium">Last</th>
              <th className="px-2 py-2 text-right font-medium">Shares</th>
              <th className="px-2 py-2 text-right font-medium">Bet</th>
              <th className="px-2 py-2 text-right font-medium">Current</th>
              <th className="px-2 py-2 text-right font-medium">Sold</th>
              <th className="px-2 py-2 text-right font-medium">Entry</th>
              <th className="px-2 py-2 text-right font-medium">Exit</th>
              <th className="px-2 py-2 text-right font-medium">Realized</th>
              <th className="px-2 py-2 text-right font-medium">Unrealized</th>
              <th className="px-2 py-2 text-right font-medium">PnL</th>
              <th className="w-[52px] px-2 py-2 text-right font-medium">Link</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => {
              const key = `${position.marketId}:${position.outcome}`;
              const selected = selectedPositionKey === key;

              return (
              <tr
                key={position.id}
                className={`cursor-pointer border-t border-line hover:bg-panel ${
                  selected ? "bg-blue-50 ring-1 ring-inset ring-signal" : ""
                }`}
                onClick={() => onSelectPosition?.(position)}
                title="Show related trades"
              >
                <td className="px-3 py-2">
                  <div className="flex items-start gap-1.5">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${Number(position.totalPnl) >= 0 ? "bg-profit" : "bg-loss"}`} />
                    <span className="line-clamp-2">{position.marketTitle ?? position.marketId}</span>
                  </div>
                </td>
                <td className="truncate px-2 py-2">{position.outcome}</td>
                <td className="px-2 py-2">
                  <span
                    className={`rounded-md px-1.5 py-1 text-[10px] font-medium ${
                      Number(position.currentShares) > 0 ? "bg-blue-50 text-signal" : "bg-panel text-slate-600"
                    }`}
                  >
                    {Number(position.currentShares) > 0 ? "Open" : "Closed"}
                  </span>
                </td>
                <td className="px-2 py-2 tabular-nums text-slate-500">{formatDate(position.lastTradeAt)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatAmount(position.currentShares, "shares")}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatAmount(position.totalBet, "usd")}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatAmount(position.currentValue, "usd")}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatAmount(position.totalReturned, "usd")}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatAmount(position.averageEntryPrice, "price")}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatAmount(position.averageExitPrice, "price")}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatAmount(position.realizedPnl, "usd")}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatAmount(position.unrealizedPnl, "usd")}</td>
                <td
                  className={`px-2 py-2 text-right tabular-nums ${
                    Number(position.totalPnl) >= 0 ? "text-profit" : "text-loss"
                  }`}
                >
                  {formatAmount(position.totalPnl, "usd")}
                </td>
                <td className="px-2 py-2 text-right">
                  <PolymarketLink position={position} />
                </td>
              </tr>
            );
            })}
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

function PolymarketLink({ position }: { position: PositionRow }) {
  const href = position.marketSlug ? `https://polymarket.com/market/${position.marketSlug}` : null;

  if (!href) {
    return <span className="text-xs text-slate-400">-</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-panel"
      title="Open this market on Polymarket"
      aria-label="Open this market on Polymarket"
    >
      <ExternalLink size={13} />
    </a>
  );
}
