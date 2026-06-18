import { ExternalLink } from "lucide-react";
import type { PositionRow } from "@polyand/types";
import { formatAmount, formatDateTime } from "../utils/format";
import { SectionHeader } from "./InfoTooltip";

interface PositionsTableProps {
  positions: PositionRow[];
  syncedAt?: string | null;
  selectedPositionKey?: string | null;
  onSelectPosition?: (position: PositionRow) => void;
  showHeader?: boolean;
  embedded?: boolean;
}

const ROW_TINT_THRESHOLD = 1; // dollars

export function PositionsTable({
  positions,
  syncedAt,
  selectedPositionKey,
  onSelectPosition,
  showHeader = true,
  embedded = false
}: PositionsTableProps) {
  return (
    <section className={embedded ? "min-w-0 bg-white" : "min-w-0 rounded-lg border border-line bg-white"}>
      {showHeader ? (
        <SectionHeader
          title="Positions"
          description="Reconstructed wallet exposure by market and outcome. Bet is buy notional; Total PnL combines realized and unrealized. Rows are ordered by latest trade activity."
          aside={`${positions.length} loaded`}
        />
      ) : null}
      <div className="max-h-[844px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-panel text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="w-[34%] py-2.5 pl-4 pr-3 font-medium">Market</th>
              <th className="w-[88px] px-3 py-2.5 font-medium">Outcome</th>
              <th className="px-3 py-2.5 text-right font-medium">Shares</th>
              <th className="px-3 py-2.5 text-right font-medium">
                Bet <span className="font-normal normal-case text-muted/70">/ Total PnL</span>
              </th>
              <th className="px-3 py-2.5 text-right font-medium">
                Entry <span className="font-normal normal-case text-muted/70">/ Exit</span>
              </th>
              <th className="px-3 py-2.5 text-right font-medium">
                Realized <span className="font-normal normal-case text-muted/70">/ Unrealized</span>
              </th>
              <th className="px-3 py-2.5 text-right font-medium">Sold</th>
              <th className="w-[60px] px-3 py-2.5 text-right font-medium">Conf</th>
              <th className="w-[44px] py-2.5 pl-2 pr-4" aria-label="Link" />
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => {
              const key = `${position.marketId}:${position.outcome}`;
              const selected = selectedPositionKey === key;
              const totalPnl = Number(position.totalPnl);
              const tone: Tone = totalPnl > 0 ? "profit" : totalPnl < 0 ? "loss" : "neutral";
              const tintRow = Math.abs(totalPnl) >= ROW_TINT_THRESHOLD;
              const hasShares = Number(position.currentShares) > 0;
              const isSettled = position.marketResolved;
              const wonSettlement =
                isSettled && position.winningOutcome != null && position.winningOutcome === position.outcome;
              const realizedNum = Number(position.realizedPnl);
              const unrealizedNum = Number(position.unrealizedPnl);

              return (
                <tr
                  key={position.id}
                  onClick={() => onSelectPosition?.(position)}
                  title="Show related trades"
                  className={[
                    "group cursor-pointer border-t border-line align-middle transition-colors",
                    selected
                      ? "bg-signal-soft ring-1 ring-inset ring-signal/40"
                      : tintRow
                        ? tone === "profit"
                          ? "bg-profit-soft hover:bg-profit-soft/70"
                          : tone === "loss"
                            ? "bg-loss-soft hover:bg-loss-soft/70"
                            : "hover:bg-panel"
                        : "hover:bg-panel"
                  ].join(" ")}
                >
                  <td
                    className={[
                      "max-w-[520px] py-2.5 pl-4 pr-3 leading-snug border-l-[3px]",
                      tone === "profit"
                        ? "border-profit-edge"
                        : tone === "loss"
                          ? "border-loss-edge"
                          : "border-transparent"
                    ].join(" ")}
                  >
                    <div className="text-sm text-ink">{position.marketTitle ?? position.marketId}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                      <StatusPill hasShares={hasShares} settled={isSettled} won={wonSettlement} />
                      <span className="tabular-nums">{formatDateTime(position.lastTradeAt)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-sm">{position.outcome}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-sm text-ink">
                    {formatAmount(position.currentShares, "shares")}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <div className="text-sm text-ink">{formatAmount(position.totalBet, "usd")}</div>
                    <div className={`mt-0.5 text-[11px] font-medium ${toneText(tone)}`}>
                      {formatAmount(position.totalPnl, "usd")}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <div className="text-sm text-ink">{formatAmount(position.averageEntryPrice, "price")}</div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      {formatAmount(position.averageExitPrice, "price")}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <div className={`text-sm ${realizedNum === 0 ? "text-ink" : toneText(toneFromNumber(realizedNum))}`}>
                      {formatAmount(position.realizedPnl, "usd")}
                    </div>
                    <div
                      className={`mt-0.5 text-[11px] ${
                        unrealizedNum === 0 ? "text-muted" : toneText(toneFromNumber(unrealizedNum))
                      }`}
                    >
                      {formatAmount(position.unrealizedPnl, "usd")}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-sm text-muted">
                    {formatAmount(position.totalReturned, "usd")}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-sm text-muted">
                    {position.confidenceScore}
                  </td>
                  <td className="py-2.5 pl-2 pr-4 text-right">
                    <PolymarketLink position={position} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {positions.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted">
            {syncedAt ? "Synced, but no positions could be reconstructed." : "No positions loaded"}
          </div>
        ) : null}
      </div>
    </section>
  );
}

type Tone = "profit" | "loss" | "neutral";

function toneFromNumber(value: number): Tone {
  if (value > 0) return "profit";
  if (value < 0) return "loss";
  return "neutral";
}

function toneText(tone: Tone): string {
  if (tone === "profit") return "text-profit";
  if (tone === "loss") return "text-loss";
  return "text-muted";
}

function StatusPill({
  hasShares,
  settled,
  won
}: {
  hasShares: boolean;
  settled: boolean;
  won: boolean;
}) {
  const baseClass = "rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide";
  if (settled) {
    return (
      <span
        className={
          won ? `${baseClass} bg-profit-soft text-profit` : `${baseClass} bg-loss-soft text-loss`
        }
      >
        {won ? "Won" : "Lost"}
      </span>
    );
  }
  if (hasShares) {
    return <span className={`${baseClass} bg-signal-soft text-signal`}>Open</span>;
  }
  return <span className={`${baseClass} bg-panel text-muted`}>Closed</span>;
}

function PolymarketLink({ position }: { position: PositionRow }) {
  const href = position.marketSlug ? `https://polymarket.com/market/${position.marketSlug}` : null;

  if (!href) {
    return <span className="text-xs text-muted">—</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted opacity-0 transition group-hover:opacity-100 hover:bg-panel hover:text-ink focus:opacity-100"
      title="Open this market on Polymarket"
      aria-label="Open this market on Polymarket"
    >
      <ExternalLink size={14} />
    </a>
  );
}
