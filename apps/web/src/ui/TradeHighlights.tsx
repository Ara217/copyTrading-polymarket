import type { TradeHighlight, WalletPerformance } from "@polyand/types";
import { formatAmount, formatDateTime } from "../utils/format";
import { InfoTooltip } from "./InfoTooltip";

interface TradeHighlightsProps {
  performance: WalletPerformance | null;
}

export function TradeHighlights({ performance }: TradeHighlightsProps) {
  return (
    <section className="grid gap-3 lg:grid-cols-2">
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
  const empty = !highlight;
  return (
    <div
      className={[
        "rounded-lg border bg-white p-4",
        empty
          ? "border-line"
          : tone === "profit"
            ? "border-profit/30"
            : "border-loss/30"
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{title}</div>
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
        <div className="mt-2 grid gap-1.5 text-sm">
          <div className={`text-2xl font-semibold tabular-nums ${tone === "profit" ? "text-profit" : "text-loss"}`}>
            {formatAmount(highlight.pnl, "usd")}
          </div>
          <div className="leading-snug text-ink">{highlight.marketTitle ?? highlight.conditionId}</div>
          <div className="text-[11px] text-muted">
            {highlight.outcome} · price {formatAmount(highlight.price, "price")} · size{" "}
            {formatAmount(highlight.size, "shares")} · {formatDateTime(highlight.timestamp)}
          </div>
        </div>
      ) : (
        <div className="mt-2 text-sm text-muted">
          {tone === "profit"
            ? "No profitable closed trade yet."
            : "No losing closed trade yet."}
        </div>
      )}
    </div>
  );
}
