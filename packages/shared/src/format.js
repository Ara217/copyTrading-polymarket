const compactFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2
});
const standardFormatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
});
const preciseFormatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
});
const priceFormatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
});
export function formatAmount(value, style = "number") {
    if (value === null || value === undefined || value === "") {
        return "-";
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return "-";
    }
    const absolute = Math.abs(numeric);
    const sign = numeric < 0 ? "-" : "";
    const prefix = style === "usd" ? "$" : "";
    if (style === "price") {
        return `${sign}${prefix}${priceFormatter.format(absolute)}`;
    }
    if (absolute >= 1_000_000) {
        return `${sign}${prefix}${compactFormatter.format(absolute)}`;
    }
    if (absolute > 0 && absolute < 0.01) {
        return `${sign}${prefix}${preciseFormatter.format(absolute)}`;
    }
    return `${sign}${prefix}${standardFormatter.format(absolute)}`;
}
export function formatPercent(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return "-";
    }
    return `${(numeric * 100).toFixed(1)}%`;
}
export function formatDateTime(value) {
    if (!value) {
        return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }
    return date.toLocaleString();
}
export function formatDate(value) {
    if (!value) {
        return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }
    return date.toLocaleDateString();
}
//# sourceMappingURL=format.js.map