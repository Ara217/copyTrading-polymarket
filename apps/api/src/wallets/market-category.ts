export function inferMarketCategory(
  category: string | null,
  title: string | null,
  slug: string | null,
  rawJson: unknown
): string {
  const metadataCategory = extractCategoryFromRawJson(rawJson);
  const existing = category?.trim() || metadataCategory;
  if (existing) {
    return normalizeCategory(existing);
  }

  const text = `${title ?? ""} ${slug ?? ""}`.toLowerCase();
  if (!text.trim()) {
    return "Unknown";
  }

  if (
    includesAny(text, [
      "nba",
      "wnba",
      "nfl",
      "nhl",
      "mlb",
      "soccer",
      "football",
      "tennis",
      "golf",
      "ufc",
      "mma",
      "boxing",
      "cricket",
      "rugby",
      "fifa",
      "uefa",
      "epl",
      "premier league",
      "la liga",
      "serie a",
      "bundesliga",
      "friendlies",
      "blast",
      "itf",
      "atp",
      "wta",
      "brewers",
      "dodgers",
      "athletics"
    ])
  ) {
    return "Sports";
  }
  if (
    includesAny(text, [
      "bitcoin",
      "btc",
      "ethereum",
      "eth",
      "solana",
      "crypto",
      "usdc",
      "token",
      "airdrop",
      "blockchain"
    ])
  ) {
    return "Crypto";
  }
  if (
    includesAny(text, [
      "election",
      "trump",
      "biden",
      "senate",
      "congress",
      "president",
      "mayor",
      "politics",
      "poll"
    ])
  ) {
    return "Politics";
  }
  if (includesAny(text, ["counter-strike", "cs2", "league of legends", "dota", "valorant", "esports", "gaming"])) {
    return "Esports";
  }
  if (
    includesAny(text, [
      "fed",
      "inflation",
      "cpi",
      "rate cut",
      "recession",
      "nasdaq",
      "s&p",
      "stock",
      "earnings",
      "finance"
    ])
  ) {
    return "Finance";
  }
  if (includesAny(text, ["oscars", "grammy", "movie", "music", "celebrity", "culture", "box office"])) {
    return "Culture";
  }

  return "Unknown";
}

function extractCategoryFromRawJson(rawJson: unknown): string | null {
  if (!rawJson || typeof rawJson !== "object" || Array.isArray(rawJson)) {
    return null;
  }

  const candidate = rawJson as Record<string, unknown>;
  const direct = firstString(candidate, ["category", "categorySlug", "category_slug", "eventCategory"]);
  if (direct) {
    return direct;
  }

  const event = candidate.event;
  if (event && typeof event === "object" && !Array.isArray(event)) {
    return firstString(event as Record<string, unknown>, ["category", "categorySlug", "category_slug"]);
  }

  const events = candidate.events;
  if (Array.isArray(events)) {
    for (const item of events) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const category = firstString(item as Record<string, unknown>, ["category", "categorySlug", "category_slug"]);
        if (category) {
          return category;
        }
      }
    }
  }

  return null;
}

function firstString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
}

function normalizeCategory(category: string): string {
  const normalized = category.trim().toLowerCase();
  if (normalized.includes("sport")) return "Sports";
  if (normalized.includes("crypto")) return "Crypto";
  if (normalized.includes("politic") || normalized.includes("election")) return "Politics";
  if (normalized.includes("esport") || normalized.includes("gaming")) return "Esports";
  if (normalized.includes("finance") || normalized.includes("market")) return "Finance";
  if (normalized.includes("culture") || normalized.includes("entertainment")) return "Culture";
  return category.trim();
}

function includesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}
