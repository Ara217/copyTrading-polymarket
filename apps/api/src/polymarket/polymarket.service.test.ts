import { afterEach, describe, expect, it, vi } from "vitest";
import { PolymarketService } from "./polymarket.service";
import { ClobClient } from "./clob.client";
import { NormalizedMarket, NormalizedTrade } from "./types";

function trade(overrides: Partial<NormalizedTrade>): NormalizedTrade {
  return {
    id: "t1",
    walletAddress: "0xabc",
    marketId: "0xcond1",
    conditionId: "0xcond1",
    tokenId: "1111",
    outcome: "Yes",
    price: "0.4",
    size: "10",
    value: "4",
    side: "BUY",
    timestamp: "2026-06-13T16:00:00.000Z",
    transactionHash: null,
    marketTitle: null,
    marketSlug: null,
    rawJson: {},
    metadata: { source: "data", fetchedAt: "2026-06-15T00:00:00.000Z", adapterVersion: "polymarket-v1" },
    ...overrides
  };
}

function market(overrides: Partial<NormalizedMarket>): NormalizedMarket {
  return {
    conditionId: "0xcond1",
    slug: null,
    title: null,
    category: null,
    endDate: null,
    resolved: false,
    winningOutcome: null,
    lastKnownPrice: null,
    eventId: null,
    eventSlug: null,
    rawJson: {},
    metadata: { source: "gamma", fetchedAt: "2026-06-15T00:00:00.000Z", adapterVersion: "polymarket-v1" },
    ...overrides
  };
}

describe("PolymarketService.getPriceSnapshots", () => {
  it("calls CLOB with the trade tokenId, not the conditionId", async () => {
    const getMidpointPrice = vi.fn().mockResolvedValue({ marketId: "1111", outcome: "Yes", price: "0.7" });
    const getMarketResolution = vi.fn().mockResolvedValue(null);
    const clob = { getMidpointPrice, getMarketResolution } as unknown as ClobClient;
    const service = new PolymarketService({} as never, {} as never, clob);

    const snapshots = await service.getPriceSnapshots([market({})], [trade({ tokenId: "1111" })]);

    expect(getMidpointPrice).toHaveBeenCalledWith("1111", "Yes");
    expect(snapshots[0]).toMatchObject({ marketId: "0xcond1", price: "0.7", markedToMarket: true });
  });

  it("skips CLOB when tokenId is missing and falls back to the last fill price with markedToMarket=false", async () => {
    const getMidpointPrice = vi.fn();
    const getMarketResolution = vi.fn().mockResolvedValue(null);
    const clob = { getMidpointPrice, getMarketResolution } as unknown as ClobClient;
    const service = new PolymarketService({} as never, {} as never, clob);

    const snapshots = await service.getPriceSnapshots([market({})], [trade({ tokenId: null, price: "0.4" })]);

    expect(getMidpointPrice).not.toHaveBeenCalled();
    expect(snapshots[0]).toMatchObject({ price: "0.4", markedToMarket: false });
  });

  it("treats CLOB null as fallback (markedToMarket=false) but marks resolved markets as still marked", async () => {
    const getMidpointPrice = vi.fn().mockResolvedValue(null);
    const getMarketResolution = vi.fn().mockResolvedValue(null);
    const clob = { getMidpointPrice, getMarketResolution } as unknown as ClobClient;
    const service = new PolymarketService({} as never, {} as never, clob);

    const snapshots = await service.getPriceSnapshots(
      [market({ resolved: true, winningOutcome: "Yes" })],
      [trade({})]
    );

    expect(getMarketResolution).not.toHaveBeenCalled(); // gamma resolved AND named the winner — no probe needed
    expect(snapshots[0]).toMatchObject({ resolved: true, winningOutcome: "Yes", markedToMarket: true });
  });

  // Gamma's /markets exposes `closed` but has no winner field at all, so a resolved
  // market routinely arrives with winningOutcome=null. Skipping the probe on `resolved`
  // alone silently strips the winner that redemption settlement depends on.
  it("still probes CLOB when gamma reports resolved but names no winner", async () => {
    const getMidpointPrice = vi.fn().mockResolvedValue(null);
    const getMarketResolution = vi.fn().mockResolvedValue({
      closed: true,
      winningOutcome: "No",
      outcomes: [
        { outcome: "Yes", price: "0", winner: false },
        { outcome: "No", price: "1", winner: true }
      ]
    });
    const clob = { getMidpointPrice, getMarketResolution } as unknown as ClobClient;
    const service = new PolymarketService({} as never, {} as never, clob);

    const snapshots = await service.getPriceSnapshots(
      [market({ resolved: true, winningOutcome: null })],
      [trade({ outcome: "Yes" })]
    );

    expect(getMarketResolution).toHaveBeenCalledWith("0xcond1");
    expect(snapshots[0]).toMatchObject({ resolved: true, winningOutcome: "No" });
  });

  it("falls back to CLOB /markets/<id> when book is empty and gamma hasn't flagged resolution", async () => {
    const getMidpointPrice = vi.fn().mockResolvedValue(null);
    const getMarketResolution = vi.fn().mockResolvedValue({
      closed: true,
      winningOutcome: "No",
      outcomes: [
        { outcome: "Yes", price: "0", winner: false },
        { outcome: "No", price: "1", winner: true }
      ]
    });
    const clob = { getMidpointPrice, getMarketResolution } as unknown as ClobClient;
    const service = new PolymarketService({} as never, {} as never, clob);

    const snapshots = await service.getPriceSnapshots(
      [market({ resolved: false })],
      [trade({ outcome: "Yes", tokenId: "1111" })]
    );

    expect(getMarketResolution).toHaveBeenCalledWith("0xcond1");
    expect(snapshots[0]).toMatchObject({
      outcome: "Yes",
      price: "0",
      resolved: true,
      winningOutcome: "No",
      markedToMarket: true
    });
  });

  it("uses the most recent trade per (market, outcome) when picking the fallback price", async () => {
    const getMidpointPrice = vi.fn().mockResolvedValue(null);
    const getMarketResolution = vi.fn().mockResolvedValue(null);
    const clob = { getMidpointPrice, getMarketResolution } as unknown as ClobClient;
    const service = new PolymarketService({} as never, {} as never, clob);

    const snapshots = await service.getPriceSnapshots(
      [market({})],
      [
        trade({ id: "old", tokenId: null, price: "0.30", timestamp: "2026-06-01T00:00:00.000Z" }),
        trade({ id: "new", tokenId: null, price: "0.55", timestamp: "2026-06-14T00:00:00.000Z" })
      ]
    );

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].price).toBe("0.55");
  });
});

describe("PolymarketService.resolveProfileIdentifier", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("scrapes the profile page and returns the embedded proxyWallet for a username", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        `<html><script>{"proxyWallet":"0xA000000000000000000000000000000000000001","name":"inaccuratestake"}</script></html>`
    });
    vi.stubGlobal("fetch", fetchMock);
    const service = new PolymarketService({} as never, {} as never, {} as never);

    const result = await service.resolveProfileIdentifier("inaccuratestake");
    expect(result?.address).toBe("0xa000000000000000000000000000000000000001");
    expect(result?.username).toBe("inaccuratestake");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/@inaccuratestake");
  });

  it("extracts the proxyWallet from a backslash-escaped RSC flight payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      // Polymarket SSRs profile data inside a Next.js flight payload with escaped quotes.
      text: async () => `<html><script>{\\"proxyWallet\\":\\"0xCE5bec63b40392845a9a504915F607c8e03A047a\\"}</script></html>`
    });
    vi.stubGlobal("fetch", fetchMock);
    const service = new PolymarketService({} as never, {} as never, {} as never);

    const result = await service.resolveProfileIdentifier("nexuus");
    expect(result?.address).toBe("0xce5bec63b40392845a9a504915f607c8e03a047a");
  });

  it("returns null when upstream HTML lacks a proxyWallet", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => "<html>nope</html>" }));
    const service = new PolymarketService({} as never, {} as never, {} as never);
    expect(await service.resolveProfileIdentifier("inaccuratestake")).toBeNull();
  });

  it("rejects malformed usernames before the upstream fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const service = new PolymarketService({} as never, {} as never, {} as never);
    expect(await service.resolveProfileIdentifier("has space")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
