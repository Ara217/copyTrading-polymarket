import { useState } from "react";
import type { PositionRow } from "@polyand/types";
import { DataTable, matchesTitleFilter, positionColumns, positionRowClassName, TableSearch } from "@polyand/ui";
import { SectionHeader } from "./InfoTooltip";

interface PositionsTableProps {
  positions: PositionRow[];
  syncedAt?: string | null;
  selectedPositionKey?: string | null;
  onSelectPosition?: (position: PositionRow) => void;
  showHeader?: boolean;
  embedded?: boolean;
  apiWindowLimited?: boolean;
}

const rowKey = (position: PositionRow) => `${position.marketId}:${position.outcome}`;

export function PositionsTable({
  positions,
  syncedAt,
  selectedPositionKey,
  onSelectPosition,
  showHeader = true,
  embedded = false,
  apiWindowLimited = false
}: PositionsTableProps) {
  const [filter, setFilter] = useState("");
  const visible = positions.filter((position) => matchesTitleFilter(position, filter));
  return (
    <section
      className={
        embedded ? "flex min-w-0 flex-col bg-white" : "flex min-w-0 flex-col rounded-lg border border-line bg-white"
      }
    >
      {apiWindowLimited ? (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12px] leading-snug text-amber-800">
          ⚠ Trade history is truncated by Polymarket&apos;s public API (most recent trades only). Closed positions
          and realized PnL for older or high-volume markets may be incomplete or missing.
        </p>
      ) : null}
      {showHeader ? (
        <SectionHeader
          title="Positions"
          description="Reconstructed wallet exposure by market and outcome. Bet is buy notional; Total PnL combines realized and unrealized. Click a header to sort; drag headers to reorder; click a row to see its trades."
          aside={`${positions.length} loaded`}
        />
      ) : null}
      <TableSearch value={filter} onChange={setFilter} />
      <DataTable
        columns={positionColumns}
        data={visible}
        getRowId={rowKey}
        selectedRowId={selectedPositionKey}
        onRowClick={onSelectPosition}
        rowClassName={positionRowClassName}
        maxHeight="844px"
        emptyMessage={
          filter.trim()
            ? "No positions match the search."
            : syncedAt
              ? "Synced, but no positions could be reconstructed."
              : "No positions loaded"
        }
      />
    </section>
  );
}
