import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { WalletRankingLeaderboardRow } from "@polyand/types";
import { DataTable, rankingColumns } from "@polyand/ui";
import { api, type WalletRankingsQuery } from "../api/client";

const PAGE_SIZE = 25;

const SORTS: { value: NonNullable<WalletRankingsQuery["sort"]>; label: string }[] = [
  { value: "finalScore", label: "Final score" },
  { value: "simulatedRoiScore", label: "Simulated ROI" },
  { value: "recentPerformanceScore", label: "Recent performance" }
];

const CLASSIFICATIONS: WalletRankingLeaderboardRow["classification"][] = [
  "Prime copy candidate",
  "Strong copy candidate",
  "Watchlist candidate",
  "High-risk candidate",
  "Avoid copying"
];

export function LandingPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<WalletRankingLeaderboardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<NonNullable<WalletRankingsQuery["sort"]>>("finalScore");
  const [classification, setClassification] = useState<WalletRankingLeaderboardRow["classification"] | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listWalletRankings({
        page,
        pageSize: PAGE_SIZE,
        sort,
        classification: classification || undefined
      })
      .then((result) => {
        if (cancelled) return;
        setRows(result.data);
        setTotal(result.meta.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load traders");
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, sort, classification]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="mx-auto grid max-w-[1440px] gap-4 px-6 py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Traders</h2>
          <p className="mt-1 text-xs text-slate-500">Analyzed Polymarket wallets ranked for copy-trading.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1 text-slate-500">
            Sort
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as NonNullable<WalletRankingsQuery["sort"]>);
                setPage(1);
              }}
              className="rounded-md border border-line bg-white px-2 py-1.5 text-ink"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1 text-slate-500">
            Class
            <select
              value={classification}
              onChange={(e) => {
                setClassification(e.target.value as WalletRankingLeaderboardRow["classification"] | "");
                setPage(1);
              }}
              className="rounded-md border border-line bg-white px-2 py-1.5 text-ink"
            >
              <option value="">All</option>
              {CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error ? <div className="text-sm font-medium text-loss">{error}</div> : null}

      <section className="flex flex-col rounded-md border border-line bg-white">
        <DataTable
          columns={rankingColumns}
          data={rows}
          getRowId={(row) => row.walletAddress}
          onRowClick={(row) => navigate(`/wallets/${encodeURIComponent(row.walletAddress)}`)}
          enableSorting={false}
          enableColumnReorder={false}
          maxHeight="720px"
          emptyMessage={
            loading ? "Loading…" : "No analyzed traders yet — search a wallet above to analyze one."
          }
        />
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-muted">
          <span className="tabular-nums">
            {start}–{end} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded border border-line px-2 py-1 disabled:opacity-40 enabled:hover:bg-panel"
            >
              Prev
            </button>
            <span className="tabular-nums">
              {page} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount || loading}
              className="rounded border border-line px-2 py-1 disabled:opacity-40 enabled:hover:bg-panel"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
