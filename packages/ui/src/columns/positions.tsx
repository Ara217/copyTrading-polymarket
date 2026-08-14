import type { ColumnDef } from "@tanstack/react-table";
import type { PositionRow } from "@polyand/types";
import { formatAmount, formatDateTime } from "@polyand/shared";
import { PolymarketLink, StatusPill, toneFromNumber, toneText } from "../cells";

export const positionColumns: ColumnDef<PositionRow, unknown>[] = [
  {
    id: "market",
    header: "Market",
    accessorFn: (p) => p.marketTitle ?? p.marketId,
    size: 340,
    cell: ({ row, table }) => {
      const title = row.original.marketTitle ?? row.original.marketId;
      // Polymarket relists the same question under new condition IDs, so multiple
      // rows can share an identical title (e.g. an open market + its resolved
      // predecessor). Tag colliding titles with a short condition-ID so they're
      // distinguishable. ponytail: O(n) per-row scan; position lists are small.
      const collides =
        title !== row.original.marketId &&
        table
          .getCoreRowModel()
          .rows.filter((r) => (r.original.marketTitle ?? r.original.marketId) === title).length > 1;
      const tag = collides ? row.original.marketId.replace(/^0x/, "").slice(0, 6) : null;
      return (
        <div>
          <div className="text-ink">
            {title}
            {tag ? <span className="ml-1 font-mono text-[11px] text-muted">#{tag}</span> : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
            <StatusPill position={row.original} />
            <span className="tabular-nums">{formatDateTime(row.original.lastTradeAt)}</span>
          </div>
        </div>
      );
    }
  },
  {
    id: "outcome",
    header: "Outcome",
    accessorKey: "outcome",
    size: 96
  },
  {
    id: "shares",
    header: "Shares",
    accessorFn: (p) => Number(p.currentShares),
    size: 100,
    meta: { className: "text-right tabular-nums text-ink" },
    cell: ({ row }) => formatAmount(row.original.currentShares, "shares")
  },
  {
    id: "bet",
    header: "Bet / Total PnL",
    accessorFn: (p) => Number(p.totalBet),
    size: 130,
    meta: { className: "text-right tabular-nums" },
    cell: ({ row }) => {
      const tone = toneFromNumber(Number(row.original.totalPnl));
      return (
        <div>
          <div className="text-ink">{formatAmount(row.original.totalBet, "usd")}</div>
          <div className={`mt-0.5 text-[11px] font-medium ${toneText(tone)}`}>
            {formatAmount(row.original.totalPnl, "usd")}
          </div>
        </div>
      );
    }
  },
  {
    id: "entry",
    header: "Entry / Exit",
    accessorFn: (p) => Number(p.averageEntryPrice),
    size: 120,
    meta: { className: "text-right tabular-nums" },
    cell: ({ row }) => (
      <div>
        <div className="text-ink">{formatAmount(row.original.averageEntryPrice, "price")}</div>
        <div className="mt-0.5 text-[11px] text-muted">{formatAmount(row.original.averageExitPrice, "price")}</div>
      </div>
    )
  },
  {
    id: "realized",
    header: "Realized / Unrealized",
    accessorFn: (p) => Number(p.realizedPnl),
    size: 150,
    meta: { className: "text-right tabular-nums" },
    cell: ({ row }) => {
      const realized = Number(row.original.realizedPnl);
      const unrealized = Number(row.original.unrealizedPnl);
      return (
        <div>
          <div className={realized === 0 ? "text-ink" : toneText(toneFromNumber(realized))}>
            {formatAmount(row.original.realizedPnl, "usd")}
          </div>
          <div className={`mt-0.5 text-[11px] ${unrealized === 0 ? "text-muted" : toneText(toneFromNumber(unrealized))}`}>
            {formatAmount(row.original.unrealizedPnl, "usd")}
          </div>
        </div>
      );
    }
  },
  {
    id: "sold",
    header: "Sold",
    accessorFn: (p) => Number(p.totalReturned),
    size: 110,
    meta: { className: "text-right tabular-nums text-muted" },
    cell: ({ row }) => formatAmount(row.original.totalReturned, "usd")
  },
  {
    id: "conf",
    header: "Conf",
    accessorKey: "confidenceScore",
    size: 70,
    meta: { className: "text-right tabular-nums text-muted" }
  },
  {
    id: "link",
    header: "",
    size: 56,
    enableSorting: false,
    enableResizing: false,
    meta: { className: "text-right" },
    cell: ({ row }) => <PolymarketLink position={row.original} />
  }
];
