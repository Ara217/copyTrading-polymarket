import type { ColumnDef } from "@tanstack/react-table";
import type { TradeRow } from "@polyand/types";
import { formatAmount, formatDateTime } from "@polyand/shared";
import { ResultBadge, SideBadge } from "../cells";

export const tradeColumns: ColumnDef<TradeRow, unknown>[] = [
  {
    id: "when",
    header: "When",
    accessorFn: (t) => new Date(t.timestamp).getTime(),
    size: 160,
    cell: ({ row }) => (
      <span className="text-xs tabular-nums text-muted">{formatDateTime(row.original.timestamp)}</span>
    )
  },
  {
    id: "market",
    header: "Market",
    accessorFn: (t) => t.marketTitle ?? t.conditionId,
    size: 320,
    cell: ({ row }) => (
      <span className="block leading-snug text-ink">{row.original.marketTitle ?? row.original.conditionId}</span>
    )
  },
  {
    id: "outcome",
    header: "Outcome",
    accessorKey: "outcome",
    size: 96
  },
  {
    id: "side",
    header: "Side / Effect",
    accessorKey: "side",
    size: 120,
    cell: ({ row }) => (
      <div>
        <SideBadge side={row.original.side} />
        <div className="mt-0.5 text-[11px] capitalize text-muted">{row.original.positionEffect}</div>
      </div>
    )
  },
  {
    id: "result",
    header: "Result",
    accessorKey: "result",
    size: 90,
    cell: ({ row }) => <ResultBadge result={row.original.result} />
  },
  {
    id: "price",
    header: "Price / Size",
    accessorFn: (t) => Number(t.price),
    size: 120,
    meta: { className: "text-right tabular-nums" },
    cell: ({ row }) => (
      <div>
        <div className="text-ink">{formatAmount(row.original.price, "price")}</div>
        <div className="mt-0.5 text-[11px] text-muted">{formatAmount(row.original.size, "shares")}</div>
      </div>
    )
  },
  {
    id: "value",
    header: "Value / Realized",
    accessorFn: (t) => Number(t.value),
    size: 140,
    meta: { className: "text-right tabular-nums" },
    cell: ({ row }) => {
      const realized = Number(row.original.realizedPnl);
      return (
        <div>
          <div className="text-ink">{formatAmount(row.original.value, "usd")}</div>
          <div
            className={`mt-0.5 text-[11px] font-medium ${
              realized > 0 ? "text-profit" : realized < 0 ? "text-loss" : "text-muted"
            }`}
          >
            {formatAmount(row.original.realizedPnl, "usd")}
          </div>
        </div>
      );
    }
  },
  {
    id: "remain",
    header: "Remain",
    accessorFn: (t) => Number(t.remainingShares),
    size: 96,
    meta: { className: "text-right tabular-nums text-muted" },
    cell: ({ row }) => formatAmount(row.original.remainingShares, "shares")
  },
  {
    id: "tx",
    header: "Tx",
    accessorKey: "transactionHash",
    size: 150,
    enableSorting: false,
    meta: { className: "font-mono text-[11px] text-muted" },
    cell: ({ row }) => <span className="break-all">{row.original.transactionHash ?? "—"}</span>
  }
];
