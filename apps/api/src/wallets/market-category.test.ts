import { describe, expect, it } from "vitest";
import { inferMarketCategory } from "./market-category";

describe("inferMarketCategory", () => {
  it("prefers normalized upstream metadata", () => {
    expect(inferMarketCategory("sports", null, null, null)).toBe("Sports");
    expect(inferMarketCategory(null, null, null, { event: { categorySlug: "crypto" } })).toBe("Crypto");
  });

  it("classifies common Polymarket titles when metadata is missing", () => {
    expect(inferMarketCategory(null, "T20 Blast: Durham vs Lancashire", "t20-blast-dur-lan", {})).toBe("Sports");
    expect(inferMarketCategory(null, "Counter-Strike: BIG vs B8", "counter-strike-big-b8", {})).toBe("Esports");
    expect(inferMarketCategory(null, "Will Bitcoin hit $120k?", "bitcoin-120k", {})).toBe("Crypto");
    expect(inferMarketCategory(null, "Who wins the Senate election?", "senate-election", {})).toBe("Politics");
  });

  it("keeps unknown when no metadata or heuristic matches", () => {
    expect(inferMarketCategory(null, "Will this unusual event happen?", "unusual-event", {})).toBe("Unknown");
  });
});
