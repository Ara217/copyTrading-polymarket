import type { ColumnDef } from "@tanstack/react-table";
import type { WalletRankingLeaderboardRow } from "@polyand/types";
import { formatAmount, formatDateTime, formatPercent } from "@polyand/shared";
import { toneFromNumber, toneText, type Tone } from "../cells";

const pillBase = "inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide";

// Tone per classification tier; mirrors the copy-readiness ranking semantics.
const classificationTone: Record<WalletRankingLeaderboardRow["classification"], Tone> = {
  "Prime copy candidate": "profit",
  "Strong copy candidate": "profit",
  "Watchlist candidate": "signal",
  "High-risk candidate": "loss",
  "Avoid copying": "loss"
};

function ClassificationBadge({ classification }: { classification: WalletRankingLeaderboardRow["classification"] }) {
  const tone = classificationTone[classification];
  const cls =
    tone === "profit"
      ? "bg-profit-soft text-profit"
      : tone === "loss"
        ? "bg-loss-soft text-loss"
        : "bg-signal-soft text-signal";
  return <span className={`${pillBase} ${cls}`}>{classification}</span>;
}

export const rankingColumns: ColumnDef<WalletRankingLeaderboardRow, unknown>[] = [
  {
    id: "address",
    header: "Wallet",
    accessorFn: (r) => r.username ?? r.walletAddress,
    size: 170,
    cell: ({ row }) => {
      const { username, walletAddress } = row.original;
      const short = `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`;
      return username ? (
        <div>
          <div className="text-ink">{username}</div>
          <div className="mt-0.5 font-mono text-[11px] text-muted">{short}</div>
        </div>
      ) : (
        <span className="font-mono text-xs text-ink">{short}</span>
      );
    }
  },
  {
    id: "classification",
    header: "Class",
    accessorKey: "classification",
    size: 180,
    cell: ({ row }) => <ClassificationBadge classification={row.original.classification} />
  },
  {
    id: "finalScore",
    header: "Score",
    accessorKey: "finalScore",
    size: 80,
    meta: { className: "text-right tabular-nums text-ink" }
  },
  {
    id: "totalPnl",
    header: "Total PnL",
    accessorFn: (r) => Number(r.totalPnl),
    size: 120,
    meta: { className: "text-right tabular-nums" },
    cell: ({ row }) => (
      <span className={toneText(toneFromNumber(Number(row.original.totalPnl)))}>
        {formatAmount(row.original.totalPnl, "usd")}
      </span>
    )
  },
  {
    id: "roi",
    header: "ROI",
    accessorFn: (r) => Number(r.roi),
    size: 100,
    meta: { className: "text-right tabular-nums" },
    cell: ({ row }) => (
      <span className={toneText(toneFromNumber(Number(row.original.roi)))}>
        {formatPercent(row.original.roi)}
      </span>
    )
  },
  {
    id: "tradeCount",
    header: "Trades",
    accessorKey: "tradeCount",
    size: 80,
    meta: { className: "text-right tabular-nums text-muted" }
  },
  {
    id: "lastSyncedAt",
    header: "Last synced",
    accessorFn: (r) => (r.lastSyncedAt ? new Date(r.lastSyncedAt).getTime() : 0),
    size: 160,
    meta: { className: "tabular-nums text-muted text-xs" },
    cell: ({ row }) => formatDateTime(row.original.lastSyncedAt)
  }
];
