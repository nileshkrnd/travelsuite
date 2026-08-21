import type { TaxCalculationTypeLookup, TaxApplicationBasis } from "@/types";

export class TaxLookupsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "TaxLookupsApiError";
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

export async function listTaxCalculationTypes(options?: { activeOnly?: boolean }): Promise<TaxCalculationTypeLookup[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/tax-calculation-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new TaxLookupsApiError(await parseError(res), res.status);
  return (await res.json()) as TaxCalculationTypeLookup[];
}

export async function listTaxApplicationBasis(options?: { activeOnly?: boolean }): Promise<TaxApplicationBasis[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/tax-application-basis${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new TaxLookupsApiError(await parseError(res), res.status);
  return (await res.json()) as TaxApplicationBasis[];
}
