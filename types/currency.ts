export type CurrencyStatus = "active" | "inactive";

export interface Currency {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  smallCurrencyName: string;
  significantDigit: number;
  status: CurrencyStatus;
  createdAt: string;
}
