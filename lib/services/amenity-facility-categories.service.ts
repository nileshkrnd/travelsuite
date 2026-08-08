import type { AmenityFacilityCategory, ApplicableTo } from "@/types";
import {
  toAppAmenityFacilityCategory,
  type AmenityFacilityCategoryRow,
} from "@/lib/mappers/amenity-facility-category.mapper";

export class AmenityFacilityCategoriesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AmenityFacilityCategoriesApiError";
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

export async function listAmenityFacilityCategories(options?: {
  activeOnly?: boolean;
  includeDeleted?: boolean;
  applicableTo?: ApplicableTo;
}): Promise<AmenityFacilityCategory[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  if (options?.applicableTo) params.set("applicableTo", options.applicableTo);
  const qs = params.toString();
  const res = await fetch(`/api/amenity-facility-categories${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new AmenityFacilityCategoriesApiError(await parseError(res), res.status);
  const data = (await res.json()) as AmenityFacilityCategoryRow[];
  return data.map(toAppAmenityFacilityCategory);
}

export interface AmenityFacilityCategoryWriteInput {
  categoryCode: string;
  categoryName: string;
  applicableTo: ApplicableTo;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export async function createAmenityFacilityCategory(
  input: AmenityFacilityCategoryWriteInput & { createdBy: number }
): Promise<AmenityFacilityCategory> {
  const res = await fetch("/api/amenity-facility-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AmenityFacilityCategoriesApiError(await parseError(res), res.status);
  return toAppAmenityFacilityCategory(await res.json());
}

export async function updateAmenityFacilityCategory(
  amenityFacilityCategoryId: number,
  input: AmenityFacilityCategoryWriteInput & { modifiedBy: number }
): Promise<AmenityFacilityCategory> {
  const res = await fetch(`/api/amenity-facility-categories/${amenityFacilityCategoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AmenityFacilityCategoriesApiError(await parseError(res), res.status);
  return toAppAmenityFacilityCategory(await res.json());
}

export async function setAmenityFacilityCategoryActive(
  amenityFacilityCategoryId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<AmenityFacilityCategory> {
  const res = await fetch(`/api/amenity-facility-categories/${amenityFacilityCategoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new AmenityFacilityCategoriesApiError(await parseError(res), res.status);
  return toAppAmenityFacilityCategory(await res.json());
}

export async function deleteAmenityFacilityCategory(
  amenityFacilityCategoryId: number,
  modifiedBy: number
): Promise<void> {
  const res = await fetch(`/api/amenity-facility-categories/${amenityFacilityCategoryId}?modifiedBy=${modifiedBy}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new AmenityFacilityCategoriesApiError(await parseError(res), res.status);
}
