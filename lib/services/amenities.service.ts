import type { Amenity } from "@/types";
import { toAppAmenity, type AmenityRow } from "@/lib/mappers/amenity.mapper";

export class AmenitiesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AmenitiesApiError";
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

export async function listAmenities(options?: {
  activeOnly?: boolean;
  includeDeleted?: boolean;
  categoryId?: number;
  filterableOnly?: boolean;
}): Promise<Amenity[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  if (options?.categoryId) params.set("categoryId", String(options.categoryId));
  if (options?.filterableOnly) params.set("filterableOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/amenities${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new AmenitiesApiError(await parseError(res), res.status);
  const data = (await res.json()) as AmenityRow[];
  return data.map(toAppAmenity);
}

export interface AmenityWriteInput {
  amenityFacilityCategoryId: number;
  amenityCode: string;
  amenityName: string;
  description?: string | null;
  icon?: string | null;
  isFilterable?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export async function createAmenity(input: AmenityWriteInput & { createdBy: number }): Promise<Amenity> {
  const res = await fetch("/api/amenities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AmenitiesApiError(await parseError(res), res.status);
  return toAppAmenity(await res.json());
}

export async function updateAmenity(
  amenityId: number,
  input: AmenityWriteInput & { modifiedBy: number }
): Promise<Amenity> {
  const res = await fetch(`/api/amenities/${amenityId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AmenitiesApiError(await parseError(res), res.status);
  return toAppAmenity(await res.json());
}

export async function setAmenityActive(
  amenityId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<Amenity> {
  const res = await fetch(`/api/amenities/${amenityId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new AmenitiesApiError(await parseError(res), res.status);
  return toAppAmenity(await res.json());
}

export async function deleteAmenity(amenityId: number, modifiedBy: number): Promise<void> {
  const res = await fetch(`/api/amenities/${amenityId}?modifiedBy=${modifiedBy}`, { method: "DELETE" });
  if (!res.ok) throw new AmenitiesApiError(await parseError(res), res.status);
}
