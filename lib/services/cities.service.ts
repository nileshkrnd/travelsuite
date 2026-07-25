import type { City, ReferenceStatus } from "@/types";
import { toAppCity, type CityRow } from "@/lib/mappers/geo.mapper";

export class CitiesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "CitiesApiError";
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

export async function listCities(options?: {
  countryCode?: string;
  countryId?: number;
  activeOnly?: boolean;
}): Promise<City[]> {
  const params = new URLSearchParams();
  if (options?.countryCode) params.set("countryCode", options.countryCode);
  if (options?.countryId) params.set("countryId", String(options.countryId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.activeOnly === false) params.set("activeOnly", "false");
  const qs = params.toString();
  const res = await fetch(`/api/cities${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new CitiesApiError(await parseError(res), res.status);
  const data = (await res.json()) as CityRow[];
  return data.map(toAppCity);
}

export interface CityWriteInput {
  countryId: number;
  cityCode: string;
  cityName: string;
  status?: ReferenceStatus;
  createdBy?: number;
  modifiedBy?: number;
}

export async function createCity(input: CityWriteInput): Promise<City> {
  const res = await fetch("/api/cities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CitiesApiError(await parseError(res), res.status);
  return toAppCity(await res.json());
}

export async function updateCity(cityId: number, input: CityWriteInput): Promise<City> {
  const res = await fetch(`/api/cities/${cityId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CitiesApiError(await parseError(res), res.status);
  return toAppCity(await res.json());
}

export async function setCityStatus(
  cityId: number,
  status: ReferenceStatus,
  modifiedBy: number
): Promise<City> {
  const res = await fetch(`/api/cities/${cityId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, modifiedBy }),
  });
  if (!res.ok) throw new CitiesApiError(await parseError(res), res.status);
  return toAppCity(await res.json());
}
