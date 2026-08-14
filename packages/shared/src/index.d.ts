import { z } from "zod";
export * from "./format";
export declare const adapterVersion = "polymarket-v1";
export declare const evmAddressSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const polymarketUsernameSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const polymarketProfileSlugSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const paginationQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    offset: number;
    limit: number;
}, {
    offset?: number | undefined;
    limit?: number | undefined;
}>;
export declare const rankingLeaderboardQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
    sort: z.ZodDefault<z.ZodEnum<["finalScore", "simulatedRoiScore", "recentPerformanceScore"]>>;
    classification: z.ZodOptional<z.ZodEnum<["Prime copy candidate", "Strong copy candidate", "Watchlist candidate", "High-risk candidate", "Avoid copying"]>>;
    minScore: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    pageSize: number;
    sort: "finalScore" | "simulatedRoiScore" | "recentPerformanceScore";
    page: number;
    classification?: "Prime copy candidate" | "Strong copy candidate" | "Watchlist candidate" | "High-risk candidate" | "Avoid copying" | undefined;
    minScore?: number | undefined;
}, {
    pageSize?: number | undefined;
    sort?: "finalScore" | "simulatedRoiScore" | "recentPerformanceScore" | undefined;
    page?: number | undefined;
    classification?: "Prime copy candidate" | "Strong copy candidate" | "Watchlist candidate" | "High-risk candidate" | "Avoid copying" | undefined;
    minScore?: number | undefined;
}>;
export declare const copyReadinessQuerySchema: z.ZodObject<{
    copyBalance: z.ZodEffects<z.ZodDefault<z.ZodNumber>, string, number | undefined>;
    maxPositionSize: z.ZodEffects<z.ZodDefault<z.ZodNumber>, string, number | undefined>;
    minPositionSize: z.ZodEffects<z.ZodDefault<z.ZodNumber>, string, number | undefined>;
    oversizedThreshold: z.ZodEffects<z.ZodDefault<z.ZodNumber>, string, number | undefined>;
    topPercent: z.ZodDefault<z.ZodNumber>;
    relativeMultiplier: z.ZodEffects<z.ZodDefault<z.ZodNumber>, string, number | undefined>;
}, "strip", z.ZodTypeAny, {
    topPercent: number;
    copyBalance: string;
    maxPositionSize: string;
    minPositionSize: string;
    oversizedThreshold: string;
    relativeMultiplier: string;
}, {
    topPercent?: number | undefined;
    copyBalance?: number | undefined;
    maxPositionSize?: number | undefined;
    minPositionSize?: number | undefined;
    oversizedThreshold?: number | undefined;
    relativeMultiplier?: number | undefined;
}>;
export declare const copySimulationActionSchema: z.ZodEnum<["entry", "add", "reduce", "close"]>;
export declare const copySimulationSettingsSchema: z.ZodObject<{
    startingBalance: z.ZodDefault<z.ZodEffects<z.ZodNumber, string, number>>;
    copyPercentage: z.ZodDefault<z.ZodEffects<z.ZodNumber, string, number>>;
    fixedCopyAmount: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodNumber, string, number>, z.ZodNull]>>, string | null, number | null | undefined>;
    maxPositionSize: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodNumber, string, number>, z.ZodNull]>>, string | null, number | null | undefined>;
    minPositionSize: z.ZodDefault<z.ZodEffects<z.ZodNumber, string, number>>;
    maxMarketExposure: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodNumber, string, number>, z.ZodNull]>>, string | null, number | null | undefined>;
    maxTotalExposure: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodNumber, string, number>, z.ZodNull]>>, string | null, number | null | undefined>;
    delaySeconds: z.ZodDefault<z.ZodNumber>;
    allowedActions: z.ZodDefault<z.ZodArray<z.ZodEnum<["entry", "add", "reduce", "close"]>, "many">>;
    includeCategories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    excludeCategories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    includeUnresolvedMarkets: z.ZodDefault<z.ZodBoolean>;
    liquidityFilterEnabled: z.ZodDefault<z.ZodBoolean>;
    excludeOversizedTrades: z.ZodDefault<z.ZodBoolean>;
    oversizedConfig: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodObject<{
        oversizedThreshold: z.ZodDefault<z.ZodEffects<z.ZodNumber, string, number>>;
        topPercent: z.ZodDefault<z.ZodNumber>;
        relativeMultiplier: z.ZodDefault<z.ZodEffects<z.ZodNumber, string, number>>;
    }, "strip", z.ZodTypeAny, {
        topPercent: number;
        oversizedThreshold: string;
        relativeMultiplier: string;
    }, {
        topPercent?: number | undefined;
        oversizedThreshold?: number | undefined;
        relativeMultiplier?: number | undefined;
    }>, z.ZodNull]>>, {
        topPercent: number;
        oversizedThreshold: string;
        relativeMultiplier: string;
    } | null, {
        topPercent?: number | undefined;
        oversizedThreshold?: number | undefined;
        relativeMultiplier?: number | undefined;
    } | null | undefined>;
    drawdownStopPercent: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodNumber, string, number>, z.ZodNull]>>, string | null, number | null | undefined>;
}, "strip", z.ZodTypeAny, {
    maxPositionSize: string | null;
    minPositionSize: string;
    startingBalance: string;
    copyPercentage: string;
    fixedCopyAmount: string | null;
    maxMarketExposure: string | null;
    maxTotalExposure: string | null;
    delaySeconds: number;
    allowedActions: ("reduce" | "entry" | "add" | "close")[];
    includeCategories: string[];
    excludeCategories: string[];
    includeUnresolvedMarkets: boolean;
    liquidityFilterEnabled: boolean;
    excludeOversizedTrades: boolean;
    oversizedConfig: {
        topPercent: number;
        oversizedThreshold: string;
        relativeMultiplier: string;
    } | null;
    drawdownStopPercent: string | null;
}, {
    maxPositionSize?: number | null | undefined;
    minPositionSize?: number | undefined;
    startingBalance?: number | undefined;
    copyPercentage?: number | undefined;
    fixedCopyAmount?: number | null | undefined;
    maxMarketExposure?: number | null | undefined;
    maxTotalExposure?: number | null | undefined;
    delaySeconds?: number | undefined;
    allowedActions?: ("reduce" | "entry" | "add" | "close")[] | undefined;
    includeCategories?: string[] | undefined;
    excludeCategories?: string[] | undefined;
    includeUnresolvedMarkets?: boolean | undefined;
    liquidityFilterEnabled?: boolean | undefined;
    excludeOversizedTrades?: boolean | undefined;
    oversizedConfig?: {
        topPercent?: number | undefined;
        oversizedThreshold?: number | undefined;
        relativeMultiplier?: number | undefined;
    } | null | undefined;
    drawdownStopPercent?: number | null | undefined;
}>;
export type CopySimulationSettingsInput = z.input<typeof copySimulationSettingsSchema>;
export type ParsedCopySimulationSettings = z.output<typeof copySimulationSettingsSchema>;
export declare const rawMetadataSchema: z.ZodObject<{
    source: z.ZodEnum<["gamma", "data", "clob"]>;
    fetchedAt: z.ZodString;
    adapterVersion: z.ZodString;
}, "strip", z.ZodTypeAny, {
    source: "data" | "gamma" | "clob";
    fetchedAt: string;
    adapterVersion: string;
}, {
    source: "data" | "gamma" | "clob";
    fetchedAt: string;
    adapterVersion: string;
}>;
export declare const polymarketTradeSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    transactionHash: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    transaction_hash: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    txHash: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    timestamp: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodDate]>;
    conditionId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    condition_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    market: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    marketId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    market_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    slug: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    title: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    asset: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    asset_id: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    tokenId: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    token_id: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    outcome: z.ZodString;
    price: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    size: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    side: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    transactionHash: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    transaction_hash: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    txHash: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    timestamp: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodDate]>;
    conditionId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    condition_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    market: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    marketId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    market_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    slug: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    title: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    asset: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    asset_id: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    tokenId: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    token_id: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    outcome: z.ZodString;
    price: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    size: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    side: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    transactionHash: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    transaction_hash: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    txHash: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    timestamp: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodDate]>;
    conditionId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    condition_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    market: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    marketId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    market_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    slug: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    title: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    asset: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    asset_id: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    tokenId: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    token_id: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    outcome: z.ZodString;
    price: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    size: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    side: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.ZodTypeAny, "passthrough">>;
export declare const polymarketPositionSchema: z.ZodObject<{
    proxyWallet: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    user: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    asset: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    asset_id: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    conditionId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    condition_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    outcome: z.ZodString;
    outcomeIndex: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>>;
    size: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    avgPrice: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    curPrice: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    initialValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    currentValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    cashPnl: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    percentPnl: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    realizedPnl: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    redeemable: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    mergeable: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    negativeRisk: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    negative_risk: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    title: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    slug: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    eventId: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    event_id: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    eventSlug: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    event_slug: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    proxyWallet: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    user: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    asset: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    asset_id: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    conditionId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    condition_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    outcome: z.ZodString;
    outcomeIndex: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>>;
    size: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    avgPrice: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    curPrice: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    initialValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    currentValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    cashPnl: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    percentPnl: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    realizedPnl: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    redeemable: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    mergeable: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    negativeRisk: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    negative_risk: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    title: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    slug: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    eventId: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    event_id: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    eventSlug: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    event_slug: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    proxyWallet: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    user: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    asset: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    asset_id: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    conditionId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    condition_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    outcome: z.ZodString;
    outcomeIndex: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodString]>>>;
    size: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    avgPrice: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    curPrice: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    initialValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    currentValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    cashPnl: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    percentPnl: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    realizedPnl: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    redeemable: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    mergeable: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    negativeRisk: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    negative_risk: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    title: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    slug: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    eventId: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    event_id: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>>;
    eventSlug: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    event_slug: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.ZodTypeAny, "passthrough">>;
export declare const polymarketMarketSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    conditionId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    condition_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    slug: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    title: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    question: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    category: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    endDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    end_date: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    resolved: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    closed: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    winningOutcome: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    winning_outcome: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    conditionId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    condition_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    slug: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    title: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    question: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    category: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    endDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    end_date: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    resolved: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    closed: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    winningOutcome: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    winning_outcome: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    id: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    conditionId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    condition_id: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    slug: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    title: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    question: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    category: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    endDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    end_date: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    resolved: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    closed: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
    winningOutcome: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    winning_outcome: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.ZodTypeAny, "passthrough">>;
export declare function parseWalletAddress(input: unknown): string;
export declare function parseWalletIdentifier(input: unknown): string;
export declare function walletAddressFromProfileSlug(profileSlug: string): string;
export declare function extractWalletFromText(input: string): string | null;
/**
 * True if the input passes the username schema. Use this to detect when an
 * upstream lookup is required to resolve an address; the resolver itself lives
 * in the backend (apps/api/src/polymarket/polymarket.service.ts).
 */
export declare function looksLikePolymarketUsername(input: unknown): boolean;
export declare function extractWalletIdentifierFromText(input: string): string | null;
export declare function success<T>(data: T, meta?: Record<string, unknown>): {
    data: T;
    meta: Record<string, unknown>;
} | {
    data: T;
    meta?: undefined;
};
export declare function failure(code: string, message: string, details?: unknown): {
    error: {
        details?: {} | null | undefined;
        code: string;
        message: string;
    };
};
