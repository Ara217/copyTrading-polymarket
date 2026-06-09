import type { WalletPerformance } from "@polyand/types";
import { formatAmount, formatDateTime } from "../utils/format";
import { InfoTooltip } from "./InfoTooltip";

interface TradeHighlightsProps {
  performance: WalletPerformance | null;
}

export function TradeHighlights({ performance }: TradeHighlightsProps) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      <HighlightCard title="Best Trade" highlight={performance?.bestTrade ?? null} tone="profit" />
      <HighlightCard title="Worst Trade" highlight={performance?.worstTrade ?? null} tone="loss" />
    </div>
  );
}

function HighlightCard({
  title,
  highlight,
  tone
}: {
  title: string;
  highlight: WalletPerformance["bestTrade"];
  tone: "profit" | "loss";
}) {
  return (
    <div className="rounded-md border border-line bg-white p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${tone === "profit" ? "bg-profit" : "bg-loss"}`} />
          <div className="font-semibold">{title}</div>
        </div>
        <InfoTooltip
          label={`${title} explanation`}
          description={tone === "profit" ? "Highest realized closed-trade PnL." : "Lowest realized closed-trade PnL."}
        />
      </div>
      {highlight ? (
        <div className="mt-2 space-y-1">
          <div className={`text-base font-semibold tabular-nums ${tone === "profit" ? "text-profit" : "text-loss"}`}>
            {formatAmount(highlight.pnl, "usd")}
          </div>
          <div className="line-clamp-2 text-slate-700">{highlight.marketTitle ?? highlight.conditionId}</div>
          <div className="text-slate-500">
            {highlight.outcome} · {formatDateTime(highlight.timestamp)}
          </div>
        </div>
      ) : (
        <div className="mt-2 rounded-md bg-panel px-2 py-1.5 text-slate-500">No closed trade data</div>
      )}
    </div>
  );
}
