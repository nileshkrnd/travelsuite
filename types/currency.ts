export type CurrencyStatus = "active" | "inactive";

/** Global Currency master (not tenant/company scoped). */
export interface Currency {
  id: string;
  currencyKey: number;
  code: string;
  name: string;
  symbol: string;
  smallCurrencyName: string;
  significantDigit: number;
  status: CurrencyStatus;
  createdAt: string;
}
