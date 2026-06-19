import { afterEach, describe, expect, it, vi } from "vitest";
import { DataClient } from "./data.client";

describe("DataClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("paginates wallet trades until the upstream page is not full", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [trade("1"), trade("2")]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [trade("3"), trade("4")]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [trade("5")]
      });
    vi.stubGlobal("fetch", fetchMock);

    const client = new DataClient({
      get: (key: string) => {
        if (key === "POLYMARKET_DATA_TRADE_PAGE_SIZE") {
          return 2;
        }
        return undefined;
      }
    } as never);

    const trades = await client.getWalletTrades("0xdbdd45150249e229eb4ca8aa48a30dca21faa5de");

    expect(trades).toHaveLength(5);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).searchParams.get("offset"))).toEqual([
      "0",
      "2",
      "4"
    ]);
  });

  it("captures the ERC1155 token id from the upstream `asset` field", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "with-asset",
          timestamp: 1780999365,
          conditionId: "0xcondition-asset",
          asset: "69910730841487615802736046038473620030754616421912831175284551372639933569112",
          outcome: "Yes",
          price: 0.5,
          size: 10,
          side: "BUY"
        },
        {
          id: "no-asset",
          timestamp: 1780999366,
          conditionId: "0xcondition-no-asset",
          outcome: "Yes",
          price: 0.5,
          size: 10,
          side: "BUY"
        }
      ]
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new DataClient({
      get: () => undefined
    } as never);

    const trades = await client.getWalletTrades("0xdbdd45150249e229eb4ca8aa48a30dca21faa5de");

    expect(trades).toHaveLength(2);
    expect(trades[0].tokenId).toBe(
      "69910730841487615802736046038473620030754616421912831175284551372639933569112"
    );
    expect(trades[1].tokenId).toBeNull();
  });

  it("stops at the configured upstream offset ceiling", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [trade("1"), trade("2")]
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new DataClient({
      get: (key: string) => {
        if (key === "POLYMARKET_DATA_TRADE_PAGE_SIZE") {
          return 2;
        }
        if (key === "POLYMARKET_DATA_MAX_TRADE_OFFSET") {
          return 2;
        }
        return undefined;
      }
    } as never);

    await client.getWalletTrades("0xdbdd45150249e229eb4ca8aa48a30dca21faa5de");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).searchParams.get("offset"))).toEqual([
      "0",
      "2"
    ]);
  });
});

function trade(id: string) {
  return {
    id,
    timestamp: 1780999365,
    conditionId: `condition-${id}`,
    outcome: "Yes",
    price: 0.5,
    size: 10,
    side: "BUY"
  };
}

describe("DataClient.getWalletPositions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("paginates /positions with sizeThreshold=0 until upstream page is not full", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [position("a"), position("b")]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [position("c")]
      });
    vi.stubGlobal("fetch", fetchMock);

    const client = new DataClient({
      get: (key: string) => {
        if (key === "POLYMARKET_DATA_POSITION_PAGE_SIZE") return 2;
        return undefined;
      }
    } as never);

    const positions = await client.getWalletPositions("0xdbdd45150249e229eb4ca8aa48a30dca21faa5de");

    expect(positions).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstCallUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(firstCallUrl.pathname).toBe("/positions");
    expect(firstCallUrl.searchParams.get("sizeThreshold")).toBe("0");
    expect(firstCallUrl.searchParams.get("offset")).toBe("0");
    expect(positions[0].redeemable).toBe(false);
    expect(positions[0].eventId).toBe("event-a");
  });

  it("normalizes snake_case and Decimal-friendly numeric strings", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          proxyWallet: "0xabc",
          conditionId: "0xcond1",
          asset_id: "tok-1",
          outcome: "Yes",
          size: "12.5",
          avgPrice: 0.42,
          curPrice: "0.55",
          currentValue: 6.875,
          cashPnl: 1.5,
          realizedPnl: "0",
          negative_risk: true,
          redeemable: false,
          mergeable: false,
          event_id: 7777,
          event_slug: "world-cup-2026"
        }
      ]
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new DataClient({ get: () => undefined } as never);
    const positions = await client.getWalletPositions("0xdbdd45150249e229eb4ca8aa48a30dca21faa5de");
    expect(positions).toHaveLength(1);
    const row = positions[0];
    expect(row.conditionId).toBe("0xcond1");
    expect(row.tokenId).toBe("tok-1");
    expect(row.size).toBe("12.5");
    expect(row.avgPrice).toBe("0.42");
    expect(row.curPrice).toBe("0.55");
    expect(row.currentValue).toBe("6.875");
    expect(row.negativeRisk).toBe(true);
    expect(row.eventId).toBe("7777");
    expect(row.eventSlug).toBe("world-cup-2026");
  });
});

function position(id: string) {
  return {
    proxyWallet: "0xdbdd45150249e229eb4ca8aa48a30dca21faa5de",
    conditionId: `0xcond-${id}`,
    asset: `tok-${id}`,
    outcome: "Yes",
    size: "10",
    avgPrice: 0.5,
    curPrice: 0.55,
    currentValue: 5.5,
    cashPnl: 0.5,
    percentPnl: 0.1,
    realizedPnl: 0,
    redeemable: false,
    mergeable: false,
    negativeRisk: false,
    eventId: `event-${id}`,
    eventSlug: `slug-${id}`
  };
}
