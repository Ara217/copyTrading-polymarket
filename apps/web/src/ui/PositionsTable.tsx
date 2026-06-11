import { ExternalLink } from "lucide-react";
import type { PositionRow } from "@polyand/types";
import { formatAmount, formatDateTime } from "../utils/format";
import { SectionHeader } from "./InfoTooltip";

interface PositionsTableProps {
  positions: PositionRow[];
  syncedAt?: string | null;
  selectedPositionKey?: string | null;
  onSelectPosition?: (position: PositionRow) => void;
  showHeader?: boolean;
  embedded?: boolean;
}

export function PositionsTable({
  positions,
  syncedAt,
  selectedPositionKey,
  onSelectPosition,
  showHeader = true,
  embedded = false
}: PositionsTableProps) {
  return (
    <section className={embedded ? "min-w-0 bg-white" : "min-w-0 rounded-md border border-line bg-white"}>
      {showHeader ? (
        <SectionHeader
          title="Positions"
          description="Reconstructed wallet exposure by market and outcome. Bet is buy notional, Current Value is the marked value of open shares, and Sold is actual sell proceeds. Rows are ordered by latest trade activity, newest first."
          aside={`${positions.length} loaded`}
        />
      ) : null}
      <div className="max-h-[844px] overflow-auto">
        <table className="min-w-[1280px] w-full text-left text-sm">
          <thead className="sticky top-0 bg-panel text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-[32%] px-4 py-2.5 font-medium">Market</th>
              <th className="w-[13%] px-3 py-2.5 font-medium">Outcome</th>
              <th className="w-[96px] px-3 py-2.5 font-medium">Status</th>
              <th className="w-[128px] px-3 py-2.5 font-medium">Last Trade</th>
              <th className="px-3 py-2.5 text-right font-medium">Shares</th>
              <th className="px-3 py-2.5 text-right font-medium">Bet</th>
              <th className="px-3 py-2.5 text-right font-medium">Current Value</th>
              <th className="px-3 py-2.5 text-right font-medium">Sold</th>
              <th className="px-3 py-2.5 text-right font-medium">Entry</th>
              <th className="px-3 py-2.5 text-right font-medium">Exit</th>
              <th className="px-3 py-2.5 text-right font-medium">Realized</th>
              <th className="px-3 py-2.5 text-right font-medium">Unrealized</th>
              <th className="px-3 py-2.5 text-right font-medium">Total PnL</th>
              <th className="px-3 py-2.5 text-right font-medium">Conf</th>
              <th className="w-[72px] px-3 py-2.5 text-right font-medium">Link</th>
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
                <td className="max-w-[520px] px-4 py-2 leading-5">
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${Number(position.totalPnl) >= 0 ? "bg-profit" : "bg-loss"}`} />
                    <span>{position.marketTitle ?? position.marketId}</span>
                  </div>
                </td>
                <td className="px-3 py-2 leading-5">{position.outcome}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      Number(position.currentShares) > 0 ? "bg-blue-50 text-signal" : "bg-panel text-slate-600"
                    }`}
                  >
                    {Number(position.currentShares) > 0 ? "Open" : "Closed"}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs tabular-nums text-slate-600">{formatDateTime(position.lastTradeAt)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatAmount(position.currentShares, "shares")}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatAmount(position.totalBet, "usd")}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatAmount(position.currentValue, "usd")}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatAmount(position.totalReturned, "usd")}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatAmount(position.averageEntryPrice, "price")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatAmount(position.averageExitPrice, "price")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatAmount(position.realizedPnl, "usd")}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatAmount(position.unrealizedPnl, "usd")}</td>
                <td
                  className={`px-3 py-2 text-right font-medium tabular-nums ${
                    Number(position.totalPnl) >= 0 ? "text-profit" : "text-loss"
                  }`}
                >
                  {formatAmount(position.totalPnl, "usd")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{position.confidenceScore}</td>
                <td className="px-3 py-2 text-right">
                  <PolymarketLink position={position} />
                </td>
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-panel"
      title="Open this market on Polymarket"
      aria-label="Open this market on Polymarket"
    >
      <ExternalLink size={15} />
    </a>
  );
}
