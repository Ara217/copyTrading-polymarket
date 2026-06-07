import { BadGatewayException } from "@nestjs/common";

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "polyand-analytics/0.1"
    }
  });

  if (!response.ok) {
    throw new BadGatewayException(`Polymarket upstream failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["data", "trades", "markets", "results"]) {
      if (Array.isArray(record[key])) {
        return record[key];
      }
    }
  }
  return [];
}

