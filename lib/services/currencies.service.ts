import type { Currency, CurrencyStatus } from "@/types";
import { toAppCurrency, type CurrencyRow } from "@/lib/mappers/geo.mapper";

export class CurrenciesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "CurrenciesApiError";
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

export async function listCurrencies(options?: { activeOnly?: boolean }): Promise<Currency[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/currencies${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new CurrenciesApiError(await parseError(res), res.status);
  const data = (await res.json()) as CurrencyRow[];
  return data.map(toAppCurrency);
}

export interface CurrencyWriteInput {
  currencyCode: string;
  currencyName: string;
  symbol?: string;
  smallCurrencyName: string;
  significantDigit: number;
  status?: CurrencyStatus;
  createdBy?: number;
  modifiedBy?: number;
}

export async function createCurrency(input: CurrencyWriteInput): Promise<Currency> {
  const res = await fetch("/api/currencies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CurrenciesApiError(await parseError(res), res.status);
  return toAppCurrency(await res.json());
}

export async function updateCurrency(currencyId: number, input: CurrencyWriteInput): Promise<Currency> {
  const res = await fetch(`/api/currencies/${currencyId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CurrenciesApiError(await parseError(res), res.status);
  return toAppCurrency(await res.json());
}

export async function setCurrencyStatus(
  currencyId: number,
  status: CurrencyStatus,
  modifiedBy: number
): Promise<Currency> {
  const res = await fetch(`/api/currencies/${currencyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, modifiedBy }),
  });
  if (!res.ok) throw new CurrenciesApiError(await parseError(res), res.status);
  return toAppCurrency(await res.json());
}
