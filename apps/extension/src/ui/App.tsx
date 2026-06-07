import { useEffect } from "react";
import { BarChart3, RefreshCw, Search } from "lucide-react";
import { useWalletStore } from "../store/walletStore";
import { MetricGrid } from "./MetricGrid";
import { PnlChart } from "./PnlChart";
import { PositionsTable } from "./PositionsTable";
import { TradesTable } from "./TradesTable";

export function App() {
  const {
    address,
    detectedAddress,
    overview,
    trades,
    positions,
    pnlChart,
    refreshJob,
    loading,
    error,
    setAddress,
    detectFromActiveTab,
    refresh,
    loadWallet
  } = useWalletStore();

  useEffect(() => {
    void detectFromActiveTab();
  }, [detectFromActiveTab]);

  return (
    <main className="flex min-h-[640px] flex-col bg-white">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-white">
            <BarChart3 size={19} />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-5">Polyand Analytics</h1>
            <p className="text-xs text-slate-500">Polymarket wallet performance</p>
          </div>
        </div>
        {refreshJob ? (
          <div className="rounded-md border border-line px-3 py-1.5 text-xs text-slate-600">
            Job {refreshJob.jobId}: {refreshJob.status}
          </div>
        ) : null}
      </header>

      <section className="border-b border-line bg-panel px-5 py-4">
        <div className="flex gap-2">
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="0x wallet address or detected Polymarket URL wallet"
            className="h-10 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-signal"
          />
          <button
            type="button"
            onClick={() => void loadWallet()}
            className="flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-white"
            title="Load wallet analytics"
          >
            <Search size={16} />
            Load
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-medium text-ink"
            title="Refresh wallet data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
        <div className="mt-2 flex min-h-5 items-center justify-between text-xs">
          <span className="text-slate-500">
            {detectedAddress ? `Detected from active tab: ${detectedAddress}` : "Manual wallet input available"}
          </span>
          {error ? <span className="font-medium text-loss">{error}</span> : null}
        </div>
      </section>

      <section className="grid grid-cols-[1fr_300px] gap-4 px-5 py-4">
        <div className="min-w-0">
          <MetricGrid overview={overview} loading={loading} />
          <PnlChart points={pnlChart} />
        </div>
        <PositionsTable positions={positions} syncedAt={overview?.lastSyncedAt} />
      </section>

      <section className="min-h-0 flex-1 border-t border-line px-5 py-4">
        <TradesTable trades={trades} syncedAt={overview?.lastSyncedAt} />
      </section>
    </main>
  );
}
