import { describe, expect, it } from "vitest";
import type { WalletRankingLeaderboardRow } from "@polyand/types";
import { rankingColumns } from "./rankings";

const row = {
  walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
  totalPnl: "1234.5",
  roi: "0.018",
  tradeCount: 42,
  lastSyncedAt: "2026-06-08T12:00:00.000Z",
  finalScore: 87,
  classification: "Prime copy candidate"
} as WalletRankingLeaderboardRow;

function accessor(id: string) {
  const col = rankingColumns.find((c) => c.id === id);
  if (!col || !("accessorFn" in col) || !col.accessorFn) throw new Error(`no accessorFn for ${id}`);
  return col.accessorFn;
}

describe("rankingColumns", () => {
  it("exposes the expected columns", () => {
    expect(rankingColumns.map((c) => c.id)).toEqual([
      "address",
      "classification",
      "finalScore",
      "totalPnl",
      "roi",
      "tradeCount",
      "lastSyncedAt"
    ]);
  });

  it("wires numeric accessors to the row fields for sorting", () => {
    expect(accessor("totalPnl")(row, 0)).toBe(1234.5);
    expect(accessor("roi")(row, 0)).toBe(0.018);
    expect(accessor("lastSyncedAt")(row, 0)).toBe(new Date(row.lastSyncedAt!).getTime());
  });
});
