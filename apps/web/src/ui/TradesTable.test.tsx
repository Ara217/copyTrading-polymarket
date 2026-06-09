import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TradeRow } from "@polyand/types";
import { TradesTable } from "./TradesTable";

describe("TradesTable", () => {
  it("renders long market titles and transaction hashes without truncation classes", () => {
    const longMarketTitle =
      "Will a very specific multi-clause Polymarket question with many details render in the web dashboard without being clipped?";
    const longTransactionHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const trade: TradeRow = {
      id: "trade-1",
      timestamp: "2026-06-08T12:00:00.000Z",
      marketId: "market-1",
      marketTitle: longMarketTitle,
      marketSlug: "long-market",
      conditionId: "condition-1",
      outcome: "Yes",
      price: "0.42",
      size: "100",
      value: "42",
      transactionHash: longTransactionHash,
      side: "buy",
      positionEffect: "entry",
      realizedPnl: "0",
      result: "open",
      remainingShares: "100",
      marketResolved: false
    };

    const markup = renderToStaticMarkup(<TradesTable trades={[trade]} syncedAt="2026-06-08T12:00:00.000Z" />);

    expect(markup).toContain(longMarketTitle);
    expect(markup).toContain(longTransactionHash);
    expect(markup).not.toContain("truncate");
    expect(markup).toContain("API limit 500");
  });
});
