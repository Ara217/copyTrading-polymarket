import { useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type RowData,
  type SortingState
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Extra Tailwind classes applied to both the header and body cells. */
    className?: string;
  }
}

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedRowId?: string | null;
  /** Per-row class string for tinting (profit/loss) and the left accent border. */
  rowClassName?: (row: T) => string;
  enableSorting?: boolean;
  enableColumnReorder?: boolean;
  enableColumnResize?: boolean;
  /** "virtual" renders only visible rows (default); "paginate" adds page controls. */
  mode?: "virtual" | "paginate";
  pageSize?: number;
  /** CSS max-height for the scroll viewport, e.g. "844px". */
  maxHeight?: string;
  estimatedRowHeight?: number;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  onRowClick,
  selectedRowId,
  rowClassName,
  enableSorting = true,
  enableColumnReorder = true,
  enableColumnResize = true,
  mode = "virtual",
  pageSize = 50,
  maxHeight = "640px",
  estimatedRowHeight = 56,
  emptyMessage = "No rows"
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [dragColumn, setDragColumn] = useState<string | null>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnOrder },
    getRowId,
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    enableSorting,
    columnResizeMode: "onChange",
    enableColumnResizing: enableColumnResize,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getPaginationRowModel: mode === "paginate" ? getPaginationRowModel() : undefined,
    initialState: mode === "paginate" ? { pagination: { pageSize, pageIndex: 0 } } : undefined
  });

  const rows = table.getRowModel().rows;
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 12
  });

  const virtualItems = mode === "virtual" ? virtualizer.getVirtualItems() : [];
  const paddingTop = mode === "virtual" && virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    mode === "virtual" && virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  const renderRows: Array<{ row: Row<T>; measureIndex?: number }> =
    mode === "virtual"
      ? virtualItems.map((vi) => ({ row: rows[vi.index], measureIndex: vi.index }))
      : rows.map((row) => ({ row }));

  const reorder = (from: string, to: string) => {
    const order = table.getAllLeafColumns().map((c) => c.id);
    const current = columnOrder.length ? columnOrder : order;
    const next = [...current];
    const fromIdx = next.indexOf(from);
    const toIdx = next.indexOf(to);
    if (fromIdx < 0 || toIdx < 0) return;
    next.splice(toIdx, 0, next.splice(fromIdx, 1)[0]);
    setColumnOrder(next);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto" style={{ maxHeight }}>
        <table
          className="text-left text-sm"
          style={{ width: table.getCenterTotalSize(), minWidth: "100%" }}
        >
          <thead className="sticky top-0 z-10 bg-panel text-[11px] uppercase tracking-wide text-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{ width: header.getSize() }}
                      draggable={enableColumnReorder}
                      onDragStart={() => setDragColumn(header.column.id)}
                      onDragOver={(e) => enableColumnReorder && e.preventDefault()}
                      onDrop={(e) => {
                        if (!enableColumnReorder || !dragColumn) return;
                        e.preventDefault();
                        reorder(dragColumn, header.column.id);
                        setDragColumn(null);
                      }}
                      className={[
                        "relative select-none px-3 py-2.5 font-medium",
                        enableColumnReorder ? "cursor-grab active:cursor-grabbing" : "",
                        canSort ? "cursor-pointer" : "",
                        header.column.columnDef.meta?.className ?? ""
                      ].join(" ")}
                    >
                      <span
                        className="flex items-center gap-1"
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort ? (
                          sorted === "asc" ? (
                            <ArrowUp size={12} className="text-ink" />
                          ) : sorted === "desc" ? (
                            <ArrowDown size={12} className="text-ink" />
                          ) : (
                            <ChevronsUpDown size={12} className="opacity-40" />
                          )
                        ) : null}
                      </span>
                      {enableColumnResize && header.column.getCanResize() ? (
                        <span
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none select-none hover:bg-signal/30"
                        />
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 ? (
              <tr>
                <td style={{ height: paddingTop }} colSpan={columns.length} />
              </tr>
            ) : null}
            {renderRows.map(({ row, measureIndex }) => {
              const selected = selectedRowId != null && row.id === selectedRowId;
              return (
                <tr
                  key={row.id}
                  data-index={measureIndex}
                  ref={mode === "virtual" ? virtualizer.measureElement : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={[
                    "border-t border-line align-middle transition-colors",
                    onRowClick ? "cursor-pointer" : "",
                    selected ? "bg-signal-soft ring-1 ring-inset ring-signal/40" : "hover:bg-panel",
                    rowClassName && !selected ? rowClassName(row.original) : ""
                  ].join(" ")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className={["px-3 py-2.5", cell.column.columnDef.meta?.className ?? ""].join(" ")}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 ? (
              <tr>
                <td style={{ height: paddingBottom }} colSpan={columns.length} />
              </tr>
            ) : null}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted">{emptyMessage}</div>
        ) : null}
      </div>
      {mode === "paginate" && rows.length > 0 ? (
        <PaginationBar table={table} />
      ) : null}
    </div>
  );
}

function PaginationBar<T>({ table }: { table: ReturnType<typeof useReactTable<T>> }) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  const start = total === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, total);
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-muted">
      <span className="tabular-nums">
        {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="rounded border border-line px-2 py-1 disabled:opacity-40 enabled:hover:bg-panel"
        >
          Prev
        </button>
        <span className="tabular-nums">
          {pageIndex + 1} / {table.getPageCount() || 1}
        </span>
        <button
          type="button"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="rounded border border-line px-2 py-1 disabled:opacity-40 enabled:hover:bg-panel"
        >
          Next
        </button>
      </div>
    </div>
  );
}
