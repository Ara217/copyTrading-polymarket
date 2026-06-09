import type { TradeHighlight, WalletPerformance } from "@polyand/types";
import { formatAmount, formatDateTime } from "../utils/format";
import { InfoTooltip } from "./InfoTooltip";

interface TradeHighlightsProps {
  performance: WalletPerformance | null;
}

export function TradeHighlights({ performance }: TradeHighlightsProps) {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <HighlightCard title="Best Trade" highlight={performance?.bestTrade ?? null} tone="profit" />
      <HighlightCard title="Worst Trade" highlight={performance?.worstTrade ?? null} tone="loss" />
    </section>
  );
}

function HighlightCard({
  title,
  highlight,
  tone
}: {
  title: string;
  highlight: TradeHighlight | null;
  tone: "profit" | "loss";
}) {
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${tone === "profit" ? "bg-profit" : "bg-loss"}`} />
          <div className="text-sm font-semibold">{title}</div>
        </div>
        <InfoTooltip
          label={`${title} explanation`}
          description={
            tone === "profit"
              ? "Closed trade event with the highest realized PnL in the reconstructed history."
              : "Closed trade event with the lowest realized PnL in the reconstructed history."
          }
        />
      </div>
      {highlight ? (
        <div className="mt-3 grid gap-2 text-sm">
          <div className={`text-2xl font-semibold tabular-nums ${tone === "profit" ? "text-profit" : "text-loss"}`}>
            {formatAmount(highlight.pnl, "usd")}
          </div>
          <div className="leading-5 text-ink">{highlight.marketTitle ?? highlight.conditionId}</div>
          <div className="text-slate-500">
            {highlight.outcome} · price {formatAmount(highlight.price, "price")} · size{" "}
            {formatAmount(highlight.size, "shares")} · {formatDateTime(highlight.timestamp)}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-md bg-panel px-3 py-2 text-sm text-slate-500">No closed trade data</div>
      )}
    </div>
  );
}
