import type { PositionRow, TradeRow } from "@polyand/types";
import { formatAmount, formatDateTime } from "../utils/format";
import { SectionHeader } from "./InfoTooltip";

interface TradesTableProps {
  trades: TradeRow[];
  syncedAt?: string | null;
  relatedPosition?: PositionRow | null;
  totalTradeCount?: number;
}

const ROW_TINT_THRESHOLD = 1; // dollars

export function TradesTable({
  trades,
  syncedAt,
  relatedPosition,
  totalTradeCount
}: TradesTableProps) {
  const aside = relatedPosition
    ? `${trades.length} related of ${totalTradeCount ?? trades.length}`
    : `${trades.length} loaded, API limit 500`;

  return (
    <section className="flex min-h-[520px] min-w-0 flex-col rounded-lg border border-line bg-white">
      <SectionHeader
        title="Trade History"
        description="Normalized trade rows enriched with side, position effect, realized PnL, and result. Buy rows stay Open until a sell closes or reduces the position."
        aside={aside}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-panel text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="w-[150px] py-2.5 pl-4 pr-3 font-medium">When</th>
              <th className="w-[32%] px-3 py-2.5 font-medium">Market</th>
              <th className="w-[88px] px-3 py-2.5 font-medium">Outcome</th>
              <th className="w-[120px] px-3 py-2.5 font-medium">
                Side <span className="font-normal normal-case text-muted/70">/ Effect</span>
              </th>
              <th className="w-[80px] px-3 py-2.5 font-medium">Result</th>
              <th className="px-3 py-2.5 text-right font-medium">
                Price <span className="font-normal normal-case text-muted/70">/ Size</span>
              </th>
              <th className="px-3 py-2.5 text-right font-medium">
                Value <span className="font-normal normal-case text-muted/70">/ Realized</span>
              </th>
              <th className="px-3 py-2.5 text-right font-medium">Remain</th>
              <th className="w-[120px] py-2.5 pl-3 pr-4 font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => {
              const tone = resultTone(trade.result);
              const realizedNum = Number(trade.realizedPnl);
              const tintRow = trade.result !== "open" && Math.abs(realizedNum) >= ROW_TINT_THRESHOLD;

              return (
                <tr
                  key={trade.id}
                  className={[
                    "border-t border-line align-middle transition-colors hover:bg-panel",
                    tintRow ? (tone === "profit" ? "bg-profit-soft" : tone === "loss" ? "bg-loss-soft" : "") : ""
                  ].join(" ")}
                >
                  <td
                    className={[
                      "py-2.5 pl-4 pr-3 text-xs tabular-nums text-muted border-l-[3px]",
                      tone === "profit"
                        ? "border-profit-edge"
                        : tone === "loss"
                          ? "border-loss-edge"
                          : tone === "signal"
                            ? "border-signal/40"
                            : "border-transparent"
                    ].join(" ")}
                  >
                    {formatDateTime(trade.timestamp)}
                  </td>
                  <td className="max-w-[520px] px-3 py-2.5 text-sm leading-snug text-ink">
                    {trade.marketTitle ?? trade.conditionId}
                  </td>
                  <td className="px-3 py-2.5 text-sm">{trade.outcome}</td>
                  <td className="px-3 py-2.5">
                    <SideBadge side={trade.side} />
                    <div className="mt-0.5 text-[11px] capitalize text-muted">{trade.positionEffect}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <ResultBadge result={trade.result} />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <div className="text-sm text-ink">{formatAmount(trade.price, "price")}</div>
                    <div className="mt-0.5 text-[11px] text-muted">{formatAmount(trade.size, "shares")}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <div className="text-sm text-ink">{formatAmount(trade.value, "usd")}</div>
                    <div
                      className={`mt-0.5 text-[11px] font-medium ${
                        realizedNum > 0 ? "text-profit" : realizedNum < 0 ? "text-loss" : "text-muted"
                      }`}
                    >
                      {formatAmount(trade.realizedPnl, "usd")}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-sm text-muted">
                    {formatAmount(trade.remainingShares, "shares")}
                  </td>
                  <td className="break-all py-2.5 pl-3 pr-4 font-mono text-[11px] text-muted">
                    {trade.transactionHash ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {trades.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted">
            {syncedAt ? "Synced, but Polymarket returned no trades for this wallet." : "No trades loaded"}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SideBadge({ side }: { side: string }) {
  const isBuy = side === "buy";
  return (
    <span
      className={
        isBuy
          ? "rounded-sm bg-signal-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-signal"
          : "rounded-sm bg-panel px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink"
      }
    >
      {side}
    </span>
  );
}

function ResultBadge({ result }: { result: TradeRow["result"] }) {
  const tone = resultTone(result);
  const cls =
    tone === "profit"
      ? "bg-profit-soft text-profit"
      : tone === "loss"
        ? "bg-loss-soft text-loss"
        : tone === "signal"
          ? "bg-signal-soft text-signal"
          : "bg-panel text-muted";
  return (
    <span className={`inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}>
      {result}
    </span>
  );
}

function resultTone(result: TradeRow["result"]): "profit" | "loss" | "signal" | "neutral" {
  if (result === "win") return "profit";
  if (result === "loss") return "loss";
  if (result === "open") return "signal";
  return "neutral";
}
