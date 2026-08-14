import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("api.listWalletRankings", () => {
  it("builds the query string and passes meta through", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ walletAddress: "0xabc" }],
        meta: { page: 2, pageSize: 25, total: 51, sort: "finalScore" }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await api.listWalletRankings({
      page: 2,
      pageSize: 25,
      sort: "finalScore",
      classification: "Prime copy candidate"
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/rankings/wallets?");
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=25");
    expect(url).toContain("sort=finalScore");
    expect(url).toContain("classification=Prime+copy+candidate");
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(51);
  });

  it("omits undefined params", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], meta: { page: 1, pageSize: 25, total: 0, sort: "finalScore" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    await api.listWalletRankings({ page: 1 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain("classification");
    expect(url).toContain("page=1");
  });

  it("throws on API error envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { code: "BAD", message: "nope" } })
      })
    );
    await expect(api.listWalletRankings()).rejects.toThrow("nope");
  });
});
