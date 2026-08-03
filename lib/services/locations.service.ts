import type { Location } from "@/types";
import { toAppLocation, type LocationRow } from "@/lib/mappers/geo.mapper";

export class LocationsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "LocationsApiError";
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

export async function listLocations(options?: {
  countryId?: number;
  stateId?: number;
  cityId?: number;
  areaId?: number;
  activeOnly?: boolean;
  includeDeleted?: boolean;
}): Promise<Location[]> {
  const params = new URLSearchParams();
  if (options?.countryId) params.set("countryId", String(options.countryId));
  if (options?.stateId) params.set("stateId", String(options.stateId));
  if (options?.cityId) params.set("cityId", String(options.cityId));
  if (options?.areaId) params.set("areaId", String(options.areaId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  const qs = params.toString();
  const res = await fetch(`/api/locations${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new LocationsApiError(await parseError(res), res.status);
  const data = (await res.json()) as LocationRow[];
  return data.map(toAppLocation);
}

export interface LocationWriteInput {
  countryId: number;
  stateId?: number | null;
  cityId: number;
  areaId: number;
  locationCode: string;
  locationName: string;
  nativeName?: string;
  locationTypeId?: number | null;
  zoneNumber?: string;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string;
  displayOrder?: number;
  isPopular?: boolean;
  isActive?: boolean;
  createdBy?: number;
  modifiedBy?: number;
}

export async function createLocation(input: LocationWriteInput): Promise<Location> {
  const res = await fetch("/api/locations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new LocationsApiError(await parseError(res), res.status);
  return toAppLocation(await res.json());
}

export async function updateLocation(locationId: number, input: LocationWriteInput): Promise<Location> {
  const res = await fetch(`/api/locations/${locationId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new LocationsApiError(await parseError(res), res.status);
  return toAppLocation(await res.json());
}

export async function setLocationActive(
  locationId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<Location> {
  const res = await fetch(`/api/locations/${locationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new LocationsApiError(await parseError(res), res.status);
  return toAppLocation(await res.json());
}

export async function deleteLocation(locationId: number, modifiedBy: number): Promise<void> {
  const res = await fetch(`/api/locations/${locationId}?modifiedBy=${modifiedBy}`, { method: "DELETE" });
  if (!res.ok) throw new LocationsApiError(await parseError(res), res.status);
}
