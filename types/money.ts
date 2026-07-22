export type CurrencyCode = "USD" | "EUR" | "GBP" | "INR" | "AED";

export interface Money {
  value: number;
  currencyCode: CurrencyCode;
}

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
}
