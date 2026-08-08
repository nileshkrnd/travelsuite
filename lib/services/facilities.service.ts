import type { Facility } from "@/types";
import { toAppFacility, type FacilityRow } from "@/lib/mappers/facility.mapper";

export class FacilitiesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "FacilitiesApiError";
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

export async function listFacilities(options?: {
  activeOnly?: boolean;
  includeDeleted?: boolean;
  categoryId?: number;
  filterableOnly?: boolean;
}): Promise<Facility[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  if (options?.categoryId) params.set("categoryId", String(options.categoryId));
  if (options?.filterableOnly) params.set("filterableOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/facilities${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new FacilitiesApiError(await parseError(res), res.status);
  const data = (await res.json()) as FacilityRow[];
  return data.map(toAppFacility);
}

export interface FacilityWriteInput {
  amenityFacilityCategoryId: number;
  facilityCode: string;
  facilityName: string;
  description?: string | null;
  icon?: string | null;
  isFilterable?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export async function createFacility(input: FacilityWriteInput & { createdBy: number }): Promise<Facility> {
  const res = await fetch("/api/facilities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new FacilitiesApiError(await parseError(res), res.status);
  return toAppFacility(await res.json());
}

export async function updateFacility(
  facilityId: number,
  input: FacilityWriteInput & { modifiedBy: number }
): Promise<Facility> {
  const res = await fetch(`/api/facilities/${facilityId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new FacilitiesApiError(await parseError(res), res.status);
  return toAppFacility(await res.json());
}

export async function setFacilityActive(
  facilityId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<Facility> {
  const res = await fetch(`/api/facilities/${facilityId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new FacilitiesApiError(await parseError(res), res.status);
  return toAppFacility(await res.json());
}

export async function deleteFacility(facilityId: number, modifiedBy: number): Promise<void> {
  const res = await fetch(`/api/facilities/${facilityId}?modifiedBy=${modifiedBy}`, { method: "DELETE" });
  if (!res.ok) throw new FacilitiesApiError(await parseError(res), res.status);
}
