import type { Country, ReferenceStatus } from "@/types";
import { toAppCountry, type CountryRow } from "@/lib/mappers/geo.mapper";

export class CountriesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "CountriesApiError";
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

export async function listCountries(options?: { activeOnly?: boolean }): Promise<Country[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.activeOnly === false) params.set("activeOnly", "false");
  const qs = params.toString();
  const res = await fetch(`/api/countries${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new CountriesApiError(await parseError(res), res.status);
  const data = (await res.json()) as CountryRow[];
  return data.map(toAppCountry);
}

export interface CountryWriteInput {
  countryCode: string;
  countryName: string;
  dialCode: string;
  status?: ReferenceStatus;
  createdBy?: number;
  modifiedBy?: number;
}

export async function createCountry(input: CountryWriteInput): Promise<Country> {
  const res = await fetch("/api/countries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CountriesApiError(await parseError(res), res.status);
  return toAppCountry(await res.json());
}

export async function updateCountry(countryId: number, input: CountryWriteInput): Promise<Country> {
  const res = await fetch(`/api/countries/${countryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CountriesApiError(await parseError(res), res.status);
  return toAppCountry(await res.json());
}

export async function setCountryStatus(
  countryId: number,
  status: ReferenceStatus,
  modifiedBy: number
): Promise<Country> {
  const res = await fetch(`/api/countries/${countryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, modifiedBy }),
  });
  if (!res.ok) throw new CountriesApiError(await parseError(res), res.status);
  return toAppCountry(await res.json());
}
