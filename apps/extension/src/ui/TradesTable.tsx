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
    ? `${trades.length}/${totalTradeCount ?? trades.length} related`
    : `${trades.length} loaded`;

  return (
    <div className="flex flex-col rounded-md border border-line bg-white">
      <SectionHeader
        title="Trade History"
        description="Backend-enriched trade rows with side, position effect, realized PnL, and result. Click a header to sort."
        aside={aside}
      />
      <TableSearch value={filter} onChange={setFilter} />
      <DataTable
        columns={tradeColumns}
        data={visible}
        getRowId={(t) => t.id}
        rowClassName={tradeRowClassName}
        maxHeight="360px"
        emptyMessage={
          filter.trim()
            ? "No trades match the search."
            : syncedAt
              ? "Synced, but Polymarket returned no trades for this wallet."
              : "No trades loaded"
        }
      />
    </div>
  );
}
