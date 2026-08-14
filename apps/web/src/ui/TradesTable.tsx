import { useState } from "react";
import type { PositionRow, TradeRow } from "@polyand/types";
import { DataTable, matchesTitleFilter, TableSearch, tradeColumns, tradeRowClassName } from "@polyand/ui";
import { SectionHeader } from "./InfoTooltip";

interface TradesTableProps {
  trades: TradeRow[];
  syncedAt?: string | null;
  relatedPosition?: PositionRow | null;
  totalTradeCount?: number;
}

export function TradesTable({ trades, syncedAt, relatedPosition, totalTradeCount }: TradesTableProps) {
  const [filter, setFilter] = useState("");
  const visible = trades.filter((trade) => matchesTitleFilter(trade, filter));
  const aside = relatedPosition
    ? `${trades.length} related of ${totalTradeCount ?? trades.length}`
    : `${trades.length} loaded, API limit 500`;

  return (
    <section className="flex min-h-[520px] min-w-0 flex-col rounded-lg border border-line bg-white">
      <SectionHeader
        title="Trade History"
        description="Normalized trade rows enriched with side, position effect, realized PnL, and result. Buy rows stay Open until a sell closes or reduces the position. Click a header to sort; drag headers to reorder."
        aside={aside}
      />
      <TableSearch value={filter} onChange={setFilter} />
      <DataTable
        columns={tradeColumns}
        data={visible}
        getRowId={(t) => t.id}
        rowClassName={tradeRowClassName}
        maxHeight="640px"
        emptyMessage={
          filter.trim()
            ? "No trades match the search."
            : syncedAt
              ? "Synced, but Polymarket returned no trades for this wallet."
              : "No trades loaded"
        }
      />
    </section>
  );
}
