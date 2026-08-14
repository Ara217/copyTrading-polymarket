export type AmountStyle = "usd" | "shares" | "price" | "number";
export declare function formatAmount(value: string | number | null | undefined, style?: AmountStyle): string;
export declare function formatPercent(value: string | number | null | undefined): string;
export declare function formatDateTime(value: string | null | undefined): string;
export declare function formatDate(value: string | null | undefined): string;
