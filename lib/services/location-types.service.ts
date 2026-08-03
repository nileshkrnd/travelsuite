import type { LocationType } from "@/types";
import { toAppLocationType, type LocationTypeRow } from "@/lib/mappers/geo.mapper";

export class LocationTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "LocationTypesApiError";
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

export async function listLocationTypes(options?: {
  activeOnly?: boolean;
  includeDeleted?: boolean;
}): Promise<LocationType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  const qs = params.toString();
  const res = await fetch(`/api/location-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new LocationTypesApiError(await parseError(res), res.status);
  const data = (await res.json()) as LocationTypeRow[];
  return data.map(toAppLocationType);
}

export async function createLocationType(input: {
  locationTypeName: string;
  isActive?: boolean;
  createdBy: number;
}): Promise<LocationType> {
  const res = await fetch("/api/location-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new LocationTypesApiError(await parseError(res), res.status);
  return toAppLocationType(await res.json());
}

export async function updateLocationType(
  locationTypeId: number,
  input: { locationTypeName: string; isActive?: boolean; modifiedBy: number }
): Promise<LocationType> {
  const res = await fetch(`/api/location-types/${locationTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new LocationTypesApiError(await parseError(res), res.status);
  return toAppLocationType(await res.json());
}

export async function setLocationTypeActive(
  locationTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<LocationType> {
  const res = await fetch(`/api/location-types/${locationTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new LocationTypesApiError(await parseError(res), res.status);
  return toAppLocationType(await res.json());
}

export async function deleteLocationType(locationTypeId: number, modifiedBy: number): Promise<void> {
  const res = await fetch(`/api/location-types/${locationTypeId}?modifiedBy=${modifiedBy}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new LocationTypesApiError(await parseError(res), res.status);
}
