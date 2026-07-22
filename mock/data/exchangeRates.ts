import type { CurrencyCode } from "@/types";

/** Static mock FX table, base = USD. Phase 2: replace with a live rates feed. */
export const exchangeRatesToUsd: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.1,
  AED: 3.67,
};

export const currencyMeta: Record<CurrencyCode, { symbol: string; name: string }> = {
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  INR: { symbol: "₹", name: "Indian Rupee" },
  AED: { symbol: "د.إ", name: "UAE Dirham" },
};
