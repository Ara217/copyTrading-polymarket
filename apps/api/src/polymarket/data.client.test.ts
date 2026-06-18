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
