import { ExternalLink } from "lucide-react";
import type { PositionRow, TradeRow } from "@polyand/types";

export type Tone = "profit" | "loss" | "signal" | "neutral";

export function toneFromNumber(value: number): Tone {
  if (value > 0) return "profit";
  if (value < 0) return "loss";
  return "neutral";
}

export function toneText(tone: Tone): string {
  if (tone === "profit") return "text-profit";
  if (tone === "loss") return "text-loss";
  if (tone === "signal") return "text-signal";
  return "text-muted";
}

export function resultTone(result: TradeRow["result"]): Tone {
  if (result === "win") return "profit";
  if (result === "loss") return "loss";
  if (result === "open") return "signal";
  return "neutral";
}

const accent: Record<Tone, string> = {
  profit: "border-profit-edge",
  loss: "border-loss-edge",
  signal: "border-signal/40",
  neutral: "border-transparent"
};

const ROW_TINT_THRESHOLD = 1; // dollars

/** Tailwind classes for a trade row: tint + left accent, matching the legacy table. */
export function tradeRowClassName(trade: TradeRow): string {
  const tone = resultTone(trade.result);
  const realized = Number(trade.realizedPnl);
  const tint =
    trade.result !== "open" && Math.abs(realized) >= ROW_TINT_THRESHOLD
      ? tone === "profit"
        ? "bg-profit-soft"
        : tone === "loss"
          ? "bg-loss-soft"
          : ""
      : "";
  return `border-l-[3px] ${accent[tone]} ${tint}`;
}

/** Tailwind classes for a position row: tint + left accent, matching the legacy table. */
export function positionRowClassName(position: PositionRow): string {
  const tone = toneFromNumber(Number(position.totalPnl));
  const tint =
    Math.abs(Number(position.totalPnl)) >= ROW_TINT_THRESHOLD
      ? tone === "profit"
        ? "bg-profit-soft hover:bg-profit-soft/70"
        : tone === "loss"
          ? "bg-loss-soft hover:bg-loss-soft/70"
          : ""
      : "";
  return `border-l-[3px] ${accent[tone]} ${tint}`;
}

const pillBase = "rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide";

export function SideBadge({ side }: { side: string }) {
  const isBuy = side === "buy";
  return (
    <span className={isBuy ? `${pillBase} bg-signal-soft text-signal` : `${pillBase} bg-panel text-ink`}>
      {side}
    </span>
  );
}

export function ResultBadge({ result }: { result: TradeRow["result"] }) {
  const tone = resultTone(result);
  const cls =
    tone === "profit"
      ? "bg-profit-soft text-profit"
      : tone === "loss"
        ? "bg-loss-soft text-loss"
        : tone === "signal"
          ? "bg-signal-soft text-signal"
          : "bg-panel text-muted";
  return <span className={`inline-block ${pillBase} ${cls}`}>{result}</span>;
}

export function StatusPill({ position }: { position: PositionRow }) {
  const hasShares = Number(position.currentShares) > 0;
  const settled = position.marketResolved;
  const won = settled && position.winningOutcome != null && position.winningOutcome === position.outcome;
  if (settled) {
    return (
      <span className={won ? `${pillBase} bg-profit-soft text-profit` : `${pillBase} bg-loss-soft text-loss`}>
        {won ? "Won" : "Lost"}
      </span>
    );
  }
  if (hasShares) {
    return <span className={`${pillBase} bg-signal-soft text-signal`}>Open</span>;
  }
  return <span className={`${pillBase} bg-panel text-muted`}>Closed</span>;
}

export function PolymarketLink({ position }: { position: PositionRow }) {
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
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition hover:bg-panel hover:text-ink"
      title="Open this market on Polymarket"
      aria-label="Open this market on Polymarket"
    >
      <ExternalLink size={14} />
    </a>
  );
}
