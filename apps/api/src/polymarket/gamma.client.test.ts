import { afterEach, describe, expect, it, vi } from "vitest";
import { GammaClient } from "./gamma.client";

describe("GammaClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("batches condition ID lookups to avoid oversized Gamma URLs", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => []
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new GammaClient({ get: () => undefined } as never);
    const conditionIds = Array.from({ length: 121 }, (_, index) => `condition-${index}`);

    await client.getMarketsByConditionIds(conditionIds);

    // 3 batches of <=50, each fetched twice (closed=false and closed=true).
    expect(fetchMock).toHaveBeenCalledTimes(6);
    for (const [url] of fetchMock.mock.calls) {
      const requestUrl = new URL(String(url));
      expect(requestUrl.searchParams.getAll("condition_ids").length).toBeLessThanOrEqual(50);
    }
  });

  // Gamma matches `condition_ids` only when repeated per ID, and hides closed markets
  // unless asked. Comma-joining or omitting `closed` silently returns zero rows, which
  // degrades every market to a resolved:false / title:null placeholder.
  it("repeats condition_ids per ID and queries both open and closed markets", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);

    const client = new GammaClient({ get: () => undefined } as never);
    await client.getMarketsByConditionIds(["cond-a", "cond-b"]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url)));

    for (const url of urls) {
      expect(url.searchParams.getAll("condition_ids")).toEqual(["cond-a", "cond-b"]);
      // A comma-joined value would match nothing upstream.
      expect(url.searchParams.get("condition_ids")).not.toContain(",");
    }
    expect(urls.map((url) => url.searchParams.get("closed")).sort()).toEqual(["false", "true"]);
  });

  it("keeps closed markets resolved and de-duplicates across the two passes", async () => {
    const closedMarket = {
      conditionId: "cond-closed",
      question: "Will Norway win the 2026 FIFA World Cup?",
      slug: "will-norway-win-the-2026-fifa-world-cup-893",
      closed: true
    };
    const fetchMock = vi.fn().mockImplementation((url: string) => ({
      ok: true,
      // Both passes return the row so the de-dupe path is exercised.
      json: async () => (new URL(String(url)).searchParams.get("closed") ? [closedMarket] : [])
    }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new GammaClient({ get: () => undefined } as never);
    const markets = await client.getMarketsByConditionIds(["cond-closed"]);

    expect(markets).toHaveLength(1);
    expect(markets[0]).toMatchObject({
      conditionId: "cond-closed",
      resolved: true,
      title: "Will Norway win the 2026 FIFA World Cup?"
    });
  });
});
