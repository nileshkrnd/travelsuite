import { toAppPropertyUnit, type PropertyUnitRow } from "@/lib/mappers/property-unit.mapper";
import type { PropertyUnit } from "@/types";

export class PropertyUnitsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyUnitsApiError";
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

export type PropertyUnitWriteInput = {
  propertyId: number;
  propertyFloorId: number;
  unitCode: string;
  unitNumber: string;
  unitName?: string | null;
  unitTypeId: number;
  unitCategoryId?: number | null;
  unitStatusId: number;
  area: number;
  areaUnitId: number;
  bedroomCount?: number | null;
  bathroomCount?: number | null;
  parkingCount?: number | null;
  balconyCount?: number | null;
  furnishedStatusId?: number | null;
  viewTypeId?: number | null;
  unitDescription?: string | null;
  isRentable?: boolean;
  isSaleable?: boolean;
  isActive?: boolean;
};

export async function listPropertyUnits(options?: {
  propertyId?: number;
  propertyFloorId?: number;
  activeOnly?: boolean;
}): Promise<PropertyUnit[]> {
  const params = new URLSearchParams();
  if (options?.propertyId != null) params.set("propertyId", String(options.propertyId));
  if (options?.propertyFloorId != null) params.set("propertyFloorId", String(options.propertyFloorId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-units${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyUnitsApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyUnitRow[]).map(toAppPropertyUnit);
}

export async function createPropertyUnit(
  input: PropertyUnitWriteInput & { createdBy: number }
): Promise<PropertyUnit> {
  const res = await fetch("/api/property-units", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyUnitsApiError(await parseError(res), res.status);
  return toAppPropertyUnit(await res.json());
}

export async function updatePropertyUnit(
  unitId: number,
  input: PropertyUnitWriteInput & { modifiedBy: number }
): Promise<PropertyUnit> {
  const res = await fetch(`/api/property-units/${unitId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyUnitsApiError(await parseError(res), res.status);
  return toAppPropertyUnit(await res.json());
}

export async function setPropertyUnitActive(
  unitId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyUnit> {
  const res = await fetch(`/api/property-units/${unitId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyUnitsApiError(await parseError(res), res.status);
  return toAppPropertyUnit(await res.json());
}

export async function deletePropertyUnit(unitId: number): Promise<void> {
  const res = await fetch(`/api/property-units/${unitId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyUnitsApiError(await parseError(res), res.status);
}

export type UnitOccupancyAction = "allocate" | "vacate" | "block" | "unblock";

export async function updateUnitOccupancy(
  unitId: number,
  input: {
    action: UnitOccupancyAction;
    modifiedBy: number;
    propertyTenantId?: number;
    allocatedFrom?: string;
    notes?: string | null;
  }
): Promise<PropertyUnit> {
  const res = await fetch(`/api/property-units/${unitId}/occupancy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyUnitsApiError(await parseError(res), res.status);
  return toAppPropertyUnit(await res.json());
}

export async function savePropertyUnitsBatch(input: {
  propertyId: number;
  createdBy: number;
  modifiedBy?: number;
  rows: Array<
    PropertyUnitWriteInput & {
      unitId?: number | null;
    }
  >;
}): Promise<PropertyUnit[]> {
  const res = await fetch("/api/property-units/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyUnitsApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyUnitRow[]).map(toAppPropertyUnit);
}
