import { describe, expect, it } from "vitest";
import {
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
