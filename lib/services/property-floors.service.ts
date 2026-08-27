import { toAppPropertyFloor, type PropertyFloorRow } from "@/lib/mappers/property-floor.mapper";
import type { PropertyFloor } from "@/types";

export class PropertyFloorsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyFloorsApiError";
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

export type PropertyFloorWriteInput = {
  propertyId: number;
  floorCode: string;
  floorNumber: number;
  floorName: string;
  floorTypeId: number;
  displayOrder?: number;
  totalUnits?: number | null;
  occupiedUnits?: number | null;
  availableUnits?: number | null;
  floorArea?: number | null;
  areaUnitId?: number | null;
  description?: string | null;
  isActive?: boolean;
};

export async function listPropertyFloors(options?: {
  propertyId?: number;
  activeOnly?: boolean;
}): Promise<PropertyFloor[]> {
  const params = new URLSearchParams();
  if (options?.propertyId != null) params.set("propertyId", String(options.propertyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-floors${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyFloorsApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyFloorRow[]).map(toAppPropertyFloor);
}

export async function createPropertyFloor(
  input: PropertyFloorWriteInput & { createdBy: number }
): Promise<PropertyFloor> {
  const res = await fetch("/api/property-floors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyFloorsApiError(await parseError(res), res.status);
  return toAppPropertyFloor(await res.json());
}

export async function updatePropertyFloor(
  propertyFloorId: number,
  input: PropertyFloorWriteInput & { modifiedBy: number }
): Promise<PropertyFloor> {
  const res = await fetch(`/api/property-floors/${propertyFloorId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyFloorsApiError(await parseError(res), res.status);
  return toAppPropertyFloor(await res.json());
}

export async function setPropertyFloorActive(
  propertyFloorId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyFloor> {
  const res = await fetch(`/api/property-floors/${propertyFloorId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyFloorsApiError(await parseError(res), res.status);
  return toAppPropertyFloor(await res.json());
}

export async function deletePropertyFloor(propertyFloorId: number): Promise<void> {
  const res = await fetch(`/api/property-floors/${propertyFloorId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyFloorsApiError(await parseError(res), res.status);
}

export async function savePropertyFloorsBatch(input: {
  propertyId: number;
  createdBy: number;
  modifiedBy?: number;
  rows: Array<
    PropertyFloorWriteInput & {
      propertyFloorId?: number | null;
    }
  >;
}): Promise<PropertyFloor[]> {
  const res = await fetch("/api/property-floors/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyFloorsApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyFloorRow[]).map(toAppPropertyFloor);
}
