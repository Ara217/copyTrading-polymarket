import { Logger } from "@nestjs/common";
import Decimal from "decimal.js";
import type { ReconstructedPosition } from "@polyand/analytics";
import type { MarketPriceSnapshot, NormalizedMarket, NormalizedPosition } from "../polymarket/types";

const logger = new Logger("PositionsSnapshot");

const TOLERANCE_SIZE_RATIO = new Decimal("0.005"); // 0.5%
const TOLERANCE_PRICE_ABS = new Decimal("0.01"); // 1 cent

export interface PositionWithSnapshot extends ReconstructedPosition {
  curPrice: string | null;
  currentValue: string | null;
  cashPnl: string | null;
  percentPnl: string | null;
  eventId: string | null;
  negativeRisk: boolean | null;
  redeemable: boolean | null;
  mergeable: boolean | null;
  snapshotSource: "snapshot" | "reconstruction" | "snapshot-redemption";
  snapshotMatchedAt: string | null;
}

export interface PositionsSnapshotMergeResult {
  positions: PositionWithSnapshot[];
  markets: NormalizedMarket[];
  divergences: number;
  redemptionsCredited: number;
  snapshotChecked: boolean;
}

const keyOf = (conditionId: string, outcome: string) => `${conditionId}:${outcome}`;

function toDecimal(value: string | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") {
    return new Decimal(0);
  }
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

function divergesSize(a: Decimal, b: Decimal): boolean {
  const denom = Decimal.max(a.abs(), b.abs(), new Decimal("0.0001"));
  return a.minus(b).abs().div(denom).gt(TOLERANCE_SIZE_RATIO);
}

function divergesPrice(a: Decimal, b: Decimal): boolean {
  return a.minus(b).abs().gt(TOLERANCE_PRICE_ABS);
}

/**
 * Cross-check trade-replay positions against the authoritative /positions snapshot.
 *
 * Precedence rules (documented in docs/DECISIONS.md):
 *   - If upstream size === 0 (or row missing) but replay holds shares, treat as
 *     redemption / merge / off-CLOB closure: zero out shares, credit realizedPnl
 *     from upstream when present.
 *   - If size, avgPrice, realizedPnl, or currentValue diverge beyond tolerance,
 *     snapshot wins; emit positions.divergence log.
 *   - Otherwise reconstruction stands; we still attach snapshot-only fields
 *     (curPrice, currentValue, cashPnl, percentPnl, eventId, neg-risk flags).
 */
export function mergeReconstructionWithSnapshot(input: {
  walletAddress: string;
  reconstructed: ReconstructedPosition[];
  snapshot: NormalizedPosition[];
  markets: NormalizedMarket[];
  priceSnapshots: MarketPriceSnapshot[];
  snapshotAt: Date;
}): PositionsSnapshotMergeResult {
  const { walletAddress, reconstructed, snapshot, markets, priceSnapshots, snapshotAt } = input;
  const snapshotChecked = snapshot.length > 0;
  const snapshotByKey = new Map<string, NormalizedPosition>();
  for (const row of snapshot) {
    snapshotByKey.set(keyOf(row.conditionId, row.outcome), row);
  }

  // Lift winning outcome from price snapshots (gamma + CLOB resolution fallback already merged upstream).
  const winningByCondition = new Map<string, string | null>();
  for (const snap of priceSnapshots) {
    if (snap.resolved) {
      winningByCondition.set(snap.marketId, snap.winningOutcome ?? null);
    }
  }

  // Back-merge eventId/eventSlug from upstream snapshot rows into Market models.
  const eventByCondition = new Map<string, { eventId: string | null; eventSlug: string | null }>();
  for (const row of snapshot) {
    if (row.eventId || row.eventSlug) {
      eventByCondition.set(row.conditionId, { eventId: row.eventId, eventSlug: row.eventSlug });
    }
  }
  const enrichedMarkets = markets.map((market) => {
    const event = eventByCondition.get(market.conditionId);
    if (!event) return market;
    return {
      ...market,
      eventId: market.eventId ?? event.eventId ?? null,
      eventSlug: market.eventSlug ?? event.eventSlug ?? null
    };
  });

  let divergences = 0;
  let redemptionsCredited = 0;

  const finalPositions: PositionWithSnapshot[] = reconstructed.map((position) => {
    const key = keyOf(position.conditionId, position.outcome);
    const upstream = snapshotByKey.get(key);
    snapshotByKey.delete(key);

    const reShares = toDecimal(position.currentShares);
    const reRealized = toDecimal(position.realizedPnl);
    const reUnrealized = toDecimal(position.unrealizedPnl);

    if (!upstream || toDecimal(upstream.size).lte(0)) {
      // Redemption / merge / off-CLOB closure path.
      if (reShares.gt(0)) {
        redemptionsCredited += 1;
        const costBasis = toDecimal(position.averageEntryPrice).mul(reShares);
        let creditedRealized: Decimal;
        if (upstream && upstream.realizedPnl !== null) {
          creditedRealized = toDecimal(upstream.realizedPnl);
        } else {
          const winner = winningByCondition.get(position.conditionId);
          const settlement =
            winner === null || winner === undefined
              ? new Decimal(0) // unresolved: conservative, treat as zero-value close
              : winner === position.outcome
                ? new Decimal(1)
                : new Decimal(0);
          creditedRealized = reRealized.plus(settlement.mul(reShares).minus(costBasis));
        }
        logger.log(
          `positions.redemption walletAddress=${walletAddress} conditionId=${position.conditionId} outcome=${position.outcome} sharesClosed=${reShares.toString()} creditedRealized=${creditedRealized.toString()}`
        );
        return {
          ...position,
          currentShares: "0",
          averageExitPrice: position.averageExitPrice,
          realizedPnl: creditedRealized.toString(),
          unrealizedPnl: "0",
          totalPnl: creditedRealized.toString(),
          curPrice: upstream?.curPrice ?? null,
          currentValue: "0",
          cashPnl: upstream?.cashPnl ?? creditedRealized.toString(),
          percentPnl: upstream?.percentPnl ?? null,
          eventId: upstream?.eventId ?? null,
          negativeRisk: upstream?.negativeRisk ?? null,
          redeemable: upstream?.redeemable ?? null,
          mergeable: upstream?.mergeable ?? null,
          snapshotSource: "snapshot-redemption",
          snapshotMatchedAt: snapshotAt.toISOString()
        } satisfies PositionWithSnapshot;
      }
      return {
        ...position,
        curPrice: null,
        currentValue: null,
        cashPnl: null,
        percentPnl: null,
        eventId: null,
        negativeRisk: null,
        redeemable: null,
        mergeable: null,
        snapshotSource: "reconstruction",
        snapshotMatchedAt: null
      } satisfies PositionWithSnapshot;
    }

    // Upstream row exists with shares > 0. Compare; snapshot wins on divergence.
    const upSize = toDecimal(upstream.size);
    const upAvg = upstream.avgPrice !== null ? toDecimal(upstream.avgPrice) : null;
    const upRealized = upstream.realizedPnl !== null ? toDecimal(upstream.realizedPnl) : null;
    const upValue = upstream.currentValue !== null ? toDecimal(upstream.currentValue) : null;

    const reValue = reShares.mul(toDecimal(position.averageEntryPrice)).plus(reUnrealized);
    const divergedSize = divergesSize(reShares, upSize);
    const divergedAvg = upAvg !== null && divergesPrice(upAvg, toDecimal(position.averageEntryPrice));
    const divergedRealized = upRealized !== null && divergesSize(upRealized, reRealized);
    const divergedValue = upValue !== null && divergesSize(upValue, reValue);

    if (divergedSize || divergedAvg || divergedRealized || divergedValue) {
      divergences += 1;
      logger.warn(
        `positions.divergence walletAddress=${walletAddress} conditionId=${position.conditionId} outcome=${position.outcome} ` +
          `replaySize=${reShares.toString()} upstreamSize=${upSize.toString()} ` +
          `replayAvg=${position.averageEntryPrice} upstreamAvg=${upAvg?.toString() ?? "null"} ` +
          `replayRealized=${reRealized.toString()} upstreamRealized=${upRealized?.toString() ?? "null"} ` +
          `replayValue=${reValue.toString()} upstreamValue=${upValue?.toString() ?? "null"}`
      );

      // Snapshot wins. Recompute unrealizedPnl from upstream curPrice when available.
      const useShares = upSize;
      const useAvg = upAvg ?? toDecimal(position.averageEntryPrice);
      const useCurPrice = upstream.curPrice !== null ? toDecimal(upstream.curPrice) : null;
      const useUnrealized = useCurPrice ? useCurPrice.minus(useAvg).mul(useShares) : reUnrealized;
      const useRealized = upRealized ?? reRealized;
      const useTotal = useRealized.plus(useUnrealized);

      return {
        ...position,
        currentShares: useShares.toString(),
        averageEntryPrice: useAvg.toString(),
        realizedPnl: useRealized.toString(),
        unrealizedPnl: useUnrealized.toString(),
        totalPnl: useTotal.toString(),
        curPrice: upstream.curPrice ?? null,
        currentValue: upstream.currentValue ?? useShares.mul(useCurPrice ?? useAvg).toString(),
        cashPnl: upstream.cashPnl,
        percentPnl: upstream.percentPnl,
        eventId: upstream.eventId,
        negativeRisk: upstream.negativeRisk,
        redeemable: upstream.redeemable,
        mergeable: upstream.mergeable,
        snapshotSource: "snapshot",
        snapshotMatchedAt: snapshotAt.toISOString()
      } satisfies PositionWithSnapshot;
    }

    // Within tolerance — reconstruction stands. Attach snapshot-only fields.
    return {
      ...position,
      curPrice: upstream.curPrice,
      currentValue: upstream.currentValue ?? reValue.toString(),
      cashPnl: upstream.cashPnl,
      percentPnl: upstream.percentPnl,
      eventId: upstream.eventId,
      negativeRisk: upstream.negativeRisk,
      redeemable: upstream.redeemable,
      mergeable: upstream.mergeable,
      snapshotSource: "snapshot",
      snapshotMatchedAt: snapshotAt.toISOString()
    } satisfies PositionWithSnapshot;
  });

  // Any remaining upstream positions (not in reconstruction) are positions the wallet
  // holds that didn't surface in /trades — most often because they predate the
  // public Data API trade window. Treat them as snapshot-only inserts so the UI
  // reflects true current state. Realized PnL from upstream, no replay.
  for (const upstream of snapshotByKey.values()) {
    const upSize = toDecimal(upstream.size);
    if (upSize.lte(0)) continue; // skip empty rows (we already covered those via redemption path)
    const upAvg = upstream.avgPrice !== null ? toDecimal(upstream.avgPrice) : new Decimal(0);
    const upCur = upstream.curPrice !== null ? toDecimal(upstream.curPrice) : upAvg;
    const upUnrealized = upCur.minus(upAvg).mul(upSize);
    const upRealized = upstream.realizedPnl !== null ? toDecimal(upstream.realizedPnl) : new Decimal(0);
    finalPositions.push({
      marketId: upstream.conditionId,
      conditionId: upstream.conditionId,
      outcome: upstream.outcome,
      currentShares: upSize.toString(),
      averageEntryPrice: upAvg.toString(),
      averageExitPrice: "0",
      realizedPnl: upRealized.toString(),
      unrealizedPnl: upUnrealized.toString(),
      totalPnl: upRealized.plus(upUnrealized).toString(),
      confidenceScore: 70,
      curPrice: upstream.curPrice,
      currentValue: upstream.currentValue ?? upSize.mul(upCur).toString(),
      cashPnl: upstream.cashPnl,
      percentPnl: upstream.percentPnl,
      eventId: upstream.eventId,
      negativeRisk: upstream.negativeRisk,
      redeemable: upstream.redeemable,
      mergeable: upstream.mergeable,
      snapshotSource: "snapshot",
      snapshotMatchedAt: snapshotAt.toISOString()
    });
  }

  return {
    positions: finalPositions,
    markets: enrichedMarkets,
    divergences,
    redemptionsCredited,
    snapshotChecked
  };
}
