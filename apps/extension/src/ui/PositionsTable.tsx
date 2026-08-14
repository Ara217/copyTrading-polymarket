import { useState } from "react";
import type { PositionRow } from "@polyand/types";
import { DataTable, matchesTitleFilter, positionColumns, positionRowClassName, TableSearch } from "@polyand/ui";
import { SectionHeader } from "./InfoTooltip";

interface PositionsTableProps {
  positions: PositionRow[];
  syncedAt?: string | null;
  selectedPositionKey?: string | null;
  onSelectPosition?: (position: PositionRow) => void;
  apiWindowLimited?: boolean;
}

const rowKey = (position: PositionRow) => `${position.marketId}:${position.outcome}`;

export function PositionsTable({
  positions,
  syncedAt,
  selectedPositionKey,
  onSelectPosition,
  apiWindowLimited = false
}: PositionsTableProps) {
  const [filter, setFilter] = useState("");
  const visible = positions.filter((position) => matchesTitleFilter(position, filter));
  return (
    <aside className="flex min-w-0 flex-col rounded-md border border-line bg-white">
      {apiWindowLimited ? (
        <p className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800">
          ⚠ Trade history truncated by Polymarket&apos;s public API. Closed positions and realized PnL for older
          markets may be incomplete.
        </p>
      ) : null}
      <SectionHeader
        title="Positions"
        description="Reconstructed exposure by market and outcome. Click a header to sort; click a row to see its trades."
        aside={`${positions.length} loaded`}
      />
      <TableSearch value={filter} onChange={setFilter} />
      <DataTable
        columns={positionColumns}
        data={visible}
        getRowId={rowKey}
        selectedRowId={selectedPositionKey}
        onRowClick={onSelectPosition}
        rowClassName={positionRowClassName}
        maxHeight="676px"
        emptyMessage={
          filter.trim()
            ? "No positions match the search."
            : syncedAt
              ? "Synced, but no positions could be reconstructed."
              : "No positions loaded"
        }
      />
    </aside>
  );
}
