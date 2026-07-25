import { toAppAirport } from "@/lib/mappers/aviation.mapper";
import type { Airport } from "@/types";

export class AirportsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AirportsApiError";
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

export async function listAirports(options?: {
  activeOnly?: boolean;
  countryId?: number;
  cityId?: number;
}): Promise<Airport[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.countryId !== undefined) params.set("countryId", String(options.countryId));
  if (options?.cityId !== undefined) params.set("cityId", String(options.cityId));
  const qs = params.toString();
  const res = await fetch(`/api/airports${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new AirportsApiError(await parseError(res), res.status);
  return ((await res.json()) as Parameters<typeof toAppAirport>[0][]).map(toAppAirport);
}

export async function createAirport(input: {
  airportCode: string;
  airportName: string;
  countryId: number;
  cityId: number;
  parentAirportId?: number;
  latitude?: string | null;
  longitude?: string | null;
  isActive?: boolean;
  createdBy: number;
}): Promise<Airport> {
  const res = await fetch("/api/airports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AirportsApiError(await parseError(res), res.status);
  return toAppAirport(await res.json());
}

export async function updateAirport(
  airportId: number,
  input: {
    airportCode: string;
    airportName: string;
    countryId: number;
    cityId: number;
    parentAirportId?: number;
    latitude?: string | null;
    longitude?: string | null;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<Airport> {
  const res = await fetch(`/api/airports/${airportId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AirportsApiError(await parseError(res), res.status);
  return toAppAirport(await res.json());
}

export async function setAirportActive(
  airportId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<Airport> {
  const res = await fetch(`/api/airports/${airportId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new AirportsApiError(await parseError(res), res.status);
  return toAppAirport(await res.json());
}

export async function deleteAirport(airportId: number): Promise<void> {
  const res = await fetch(`/api/airports/${airportId}`, { method: "DELETE" });
  if (!res.ok) throw new AirportsApiError(await parseError(res), res.status);
}
