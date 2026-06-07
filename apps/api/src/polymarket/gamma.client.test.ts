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

    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [url] of fetchMock.mock.calls) {
      const requestUrl = new URL(String(url));
      expect(requestUrl.searchParams.get("condition_ids")?.split(",").length).toBeLessThanOrEqual(50);
    }
  });
});
