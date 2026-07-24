import type { Currency } from "@/types";
import { DEFAULT_TENANT_ID } from "./tenants";

export const currencies: Currency[] = [
  {
    id: "currency_usd",
    tenantId: DEFAULT_TENANT_ID,
    code: "USD",
    name: "US Dollar",
    smallCurrencyName: "Cent",
    significantDigit: 2,
    status: "active",
    createdAt: "2023-11-05T09:00:00.000Z",
  },
  {
    id: "currency_inr",
    tenantId: DEFAULT_TENANT_ID,
    code: "INR",
    name: "Indian Rupee",
    smallCurrencyName: "Paisa",
    significantDigit: 2,
    status: "active",
    createdAt: "2024-01-15T09:00:00.000Z",
  },
];
