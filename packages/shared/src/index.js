import { z } from "zod";
export * from "./format";
export const adapterVersion = "polymarket-v1";
export const evmAddressSchema = z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Expected a valid EVM wallet address")
    .transform((value) => value.toLowerCase());
export const polymarketUsernameSchema = z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_.-]{1,32}$/, "Expected a Polymarket username (1–32 chars; letters, digits, '_', '.', '-')")
    .transform((value) => value.toLowerCase());
export const polymarketProfileSlugSchema = z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}-\d+$/, "Expected a valid Polymarket profile slug")
    .transform((value) => value.toLowerCase());
export const paginationQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0)
});
export const rankingLeaderboardQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    sort: z.enum(["finalScore", "simulatedRoiScore", "recentPerformanceScore"]).default("finalScore"),
    classification: z
        .enum([
        "Prime copy candidate",
        "Strong copy candidate",
        "Watchlist candidate",
        "High-risk candidate",
        "Avoid copying"
    ])
        .optional(),
    minScore: z.coerce.number().int().min(0).max(100).optional()
});
export const copyReadinessQuerySchema = z.object({
    copyBalance: z.coerce.number().positive().default(1000).transform(String),
    maxPositionSize: z.coerce.number().positive().default(100).transform(String),
    minPositionSize: z.coerce.number().nonnegative().default(5).transform(String),
    oversizedThreshold: z.coerce.number().positive().default(250).transform(String),
    topPercent: z.coerce.number().min(0.01).max(1).default(0.05),
    relativeMultiplier: z.coerce.number().positive().default(3).transform(String)
});
const moneyString = (schema) => schema.transform(String);
const optionalMoneyString = (schema) => z
    .union([schema.transform(String), z.null()])
    .optional()
    .transform((value) => value ?? null);
export const copySimulationActionSchema = z.enum(["entry", "add", "reduce", "close"]);
export const copySimulationSettingsSchema = z.object({
    startingBalance: moneyString(z.coerce.number().positive()).default(1000),
    copyPercentage: moneyString(z.coerce.number().gt(0).max(1)).default(0.1),
    fixedCopyAmount: optionalMoneyString(z.coerce.number().positive()),
    maxPositionSize: optionalMoneyString(z.coerce.number().positive()),
    minPositionSize: moneyString(z.coerce.number().nonnegative()).default(5),
    maxMarketExposure: optionalMoneyString(z.coerce.number().positive()),
    maxTotalExposure: optionalMoneyString(z.coerce.number().positive()),
    delaySeconds: z.coerce.number().int().min(0).max(604800).default(0),
    allowedActions: z
        .array(copySimulationActionSchema)
        .min(1)
        .default(["entry", "add", "reduce", "close"]),
    includeCategories: z.array(z.string().trim().min(1)).default([]),
    excludeCategories: z.array(z.string().trim().min(1)).default([]),
    includeUnresolvedMarkets: z.coerce.boolean().default(true),
    liquidityFilterEnabled: z.coerce.boolean().default(false),
    excludeOversizedTrades: z.coerce.boolean().default(false),
    oversizedConfig: z
        .union([
        z.object({
            oversizedThreshold: moneyString(z.coerce.number().positive()).default(250),
            topPercent: z.coerce.number().min(0.01).max(1).default(0.05),
            relativeMultiplier: moneyString(z.coerce.number().positive()).default(3)
        }),
        z.null()
    ])
        .optional()
        .transform((value) => value ?? null),
    drawdownStopPercent: optionalMoneyString(z.coerce.number().gt(0).max(1))
});
export const rawMetadataSchema = z.object({
    source: z.enum(["gamma", "data", "clob"]),
    fetchedAt: z.string().datetime(),
    adapterVersion: z.string().min(1)
});
export const polymarketTradeSchema = z
    .object({
    id: z.union([z.string(), z.number()]).optional(),
    transactionHash: z.string().optional().nullable(),
    transaction_hash: z.string().optional().nullable(),
    txHash: z.string().optional().nullable(),
    timestamp: z.union([z.string(), z.number(), z.date()]),
    conditionId: z.string().optional().nullable(),
    condition_id: z.string().optional().nullable(),
    market: z.string().optional().nullable(),
    marketId: z.string().optional().nullable(),
    market_id: z.string().optional().nullable(),
    slug: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    asset: z.union([z.string(), z.number()]).optional().nullable(),
    asset_id: z.union([z.string(), z.number()]).optional().nullable(),
    tokenId: z.union([z.string(), z.number()]).optional().nullable(),
    token_id: z.union([z.string(), z.number()]).optional().nullable(),
    outcome: z.string(),
    price: z.union([z.string(), z.number()]),
    size: z.union([z.string(), z.number()]),
    side: z.string().optional().nullable()
})
    .passthrough();
export const polymarketPositionSchema = z
    .object({
    proxyWallet: z.string().optional().nullable(),
    user: z.string().optional().nullable(),
    asset: z.union([z.string(), z.number()]).optional().nullable(),
    asset_id: z.union([z.string(), z.number()]).optional().nullable(),
    conditionId: z.string().optional().nullable(),
    condition_id: z.string().optional().nullable(),
    outcome: z.string(),
    outcomeIndex: z.union([z.number(), z.string()]).optional().nullable(),
    size: z.union([z.string(), z.number()]),
    avgPrice: z.union([z.string(), z.number()]).optional().nullable(),
    curPrice: z.union([z.string(), z.number()]).optional().nullable(),
    initialValue: z.union([z.string(), z.number()]).optional().nullable(),
    currentValue: z.union([z.string(), z.number()]).optional().nullable(),
    cashPnl: z.union([z.string(), z.number()]).optional().nullable(),
    percentPnl: z.union([z.string(), z.number()]).optional().nullable(),
    realizedPnl: z.union([z.string(), z.number()]).optional().nullable(),
    redeemable: z.boolean().optional().nullable(),
    mergeable: z.boolean().optional().nullable(),
    negativeRisk: z.boolean().optional().nullable(),
    negative_risk: z.boolean().optional().nullable(),
    title: z.string().optional().nullable(),
    slug: z.string().optional().nullable(),
    eventId: z.union([z.string(), z.number()]).optional().nullable(),
    event_id: z.union([z.string(), z.number()]).optional().nullable(),
    eventSlug: z.string().optional().nullable(),
    event_slug: z.string().optional().nullable()
})
    .passthrough();
export const polymarketMarketSchema = z
    .object({
    id: z.union([z.string(), z.number()]).optional(),
    conditionId: z.string().optional().nullable(),
    condition_id: z.string().optional().nullable(),
    slug: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    question: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    resolved: z.boolean().optional().nullable(),
    closed: z.boolean().optional().nullable(),
    winningOutcome: z.string().optional().nullable(),
    winning_outcome: z.string().optional().nullable()
})
    .passthrough();
export function parseWalletAddress(input) {
    return evmAddressSchema.parse(input);
}
export function parseWalletIdentifier(input) {
    const profileSlug = polymarketProfileSlugSchema.safeParse(input);
    if (profileSlug.success) {
        return profileSlug.data;
    }
    return evmAddressSchema.parse(input);
}
export function walletAddressFromProfileSlug(profileSlug) {
    const normalizedSlug = polymarketProfileSlugSchema.parse(profileSlug);
    return parseWalletAddress(normalizedSlug.split("-")[0]);
}
export function extractWalletFromText(input) {
    const match = input.match(/0x[a-fA-F0-9]{40}/);
    return match ? parseWalletAddress(match[0]) : null;
}
/**
 * True if the input passes the username schema. Use this to detect when an
 * upstream lookup is required to resolve an address; the resolver itself lives
 * in the backend (apps/api/src/polymarket/polymarket.service.ts).
 */
export function looksLikePolymarketUsername(input) {
    return polymarketUsernameSchema.safeParse(input).success;
}
export function extractWalletIdentifierFromText(input) {
    const profileSlugMatch = input.match(/0x[a-fA-F0-9]{40}-\d+/);
    if (profileSlugMatch) {
        return parseWalletIdentifier(profileSlugMatch[0]);
    }
    const addressMatch = input.match(/0x[a-fA-F0-9]{40}/);
    return addressMatch ? parseWalletIdentifier(addressMatch[0]) : null;
}
export function success(data, meta) {
    return meta ? { data, meta } : { data };
}
export function failure(code, message, details) {
    return {
        error: {
            code,
            message,
            ...(details === undefined ? {} : { details })
        }
    };
}
//# sourceMappingURL=index.js.map