import { describe, expect, it } from "vitest";
import {
  copySimulationSettingsSchema,
  extractWalletFromText,
  extractWalletIdentifierFromText,
  parseWalletAddress,
  parseWalletIdentifier,
  walletAddressFromProfileSlug
} from "./index";

describe("wallet validation", () => {
  it("normalizes valid EVM addresses", () => {
    expect(parseWalletAddress("0xA000000000000000000000000000000000000001")).toBe(
      "0xa000000000000000000000000000000000000001"
    );
  });

  it("rejects invalid wallet addresses", () => {
    expect(() => parseWalletAddress("not-a-wallet")).toThrow();
  });

  it("extracts wallets from arbitrary URLs", () => {
    expect(
      extractWalletFromText(
        "https://polymarket.com/profile/0xA000000000000000000000000000000000000001"
      )
    ).toBe("0xa000000000000000000000000000000000000001");
  });

  it("preserves Polymarket profile slugs when extracting wallet identifiers", () => {
    expect(
      extractWalletIdentifierFromText(
        "https://polymarket.com/profile/0xA000000000000000000000000000000000000001-1773916108628"
      )
    ).toBe("0xa000000000000000000000000000000000000001-1773916108628");
  });

  it("accepts wallet addresses and profile slugs as wallet identifiers", () => {
    expect(parseWalletIdentifier("0xA000000000000000000000000000000000000001")).toBe(
      "0xa000000000000000000000000000000000000001"
    );
    expect(parseWalletIdentifier("0xA000000000000000000000000000000000000001-1773916108628")).toBe(
      "0xa000000000000000000000000000000000000001-1773916108628"
    );
  });

  it("resolves Polymarket profile slugs to the embedded wallet address", () => {
    expect(
      walletAddressFromProfileSlug("0xA000000000000000000000000000000000000001-1773916108628")
    ).toBe("0xa000000000000000000000000000000000000001");
  });
});

describe("copy simulation settings validation", () => {
  it("applies defaults and serializes money values as strings", () => {
    const settings = copySimulationSettingsSchema.parse({});

    expect(settings.startingBalance).toBe("1000");
    expect(settings.copyPercentage).toBe("0.1");
    expect(settings.fixedCopyAmount).toBeNull();
    expect(settings.maxPositionSize).toBeNull();
    expect(settings.minPositionSize).toBe("5");
    expect(settings.maxMarketExposure).toBeNull();
    expect(settings.maxTotalExposure).toBeNull();
    expect(settings.delaySeconds).toBe(0);
    expect(settings.allowedActions).toEqual(["entry", "add", "reduce", "close"]);
    expect(settings.includeCategories).toEqual([]);
    expect(settings.excludeCategories).toEqual([]);
    expect(settings.includeUnresolvedMarkets).toBe(true);
    expect(settings.liquidityFilterEnabled).toBe(false);
    expect(settings.excludeOversizedTrades).toBe(false);
    expect(settings.oversizedConfig).toBeNull();
    expect(settings.drawdownStopPercent).toBeNull();
  });

  it("accepts a full configuration and coerces numeric inputs", () => {
    const settings = copySimulationSettingsSchema.parse({
      startingBalance: 2500,
      copyPercentage: 0.25,
      fixedCopyAmount: 50,
      maxPositionSize: 100,
      minPositionSize: 1,
      maxMarketExposure: 200,
      maxTotalExposure: 500,
      delaySeconds: 300,
      allowedActions: ["entry", "close"],
      includeCategories: ["Crypto"],
      excludeCategories: ["Sports"],
      includeUnresolvedMarkets: false,
      liquidityFilterEnabled: true,
      excludeOversizedTrades: true,
      oversizedConfig: { oversizedThreshold: 400, topPercent: 0.05, relativeMultiplier: 3 },
      drawdownStopPercent: 0.25
    });

    expect(settings.startingBalance).toBe("2500");
    expect(settings.fixedCopyAmount).toBe("50");
    expect(settings.maxTotalExposure).toBe("500");
    expect(settings.allowedActions).toEqual(["entry", "close"]);
    expect(settings.oversizedConfig).toEqual({
      oversizedThreshold: "400",
      topPercent: 0.05,
      relativeMultiplier: "3"
    });
    expect(settings.drawdownStopPercent).toBe("0.25");
  });

  it("rejects invalid settings", () => {
    expect(() => copySimulationSettingsSchema.parse({ startingBalance: 0 })).toThrow();
    expect(() => copySimulationSettingsSchema.parse({ copyPercentage: 2 })).toThrow();
    expect(() => copySimulationSettingsSchema.parse({ delaySeconds: -5 })).toThrow();
    expect(() => copySimulationSettingsSchema.parse({ allowedActions: ["liquidate"] })).toThrow();
    expect(() => copySimulationSettingsSchema.parse({ drawdownStopPercent: 1.5 })).toThrow();
  });
});
