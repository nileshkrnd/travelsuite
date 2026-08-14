import type { InventoryType, PropertyContractInventory } from "@/types/property-contract-inventory";
import type { PropertyContractInventoryMatrixPayload } from "@/types/property-contract-inventory-matrix";
import {
  toAppInventoryType,
  toAppPropertyContractInventory,
  type InventoryTypeRow,
  type PropertyContractInventoryRow,
} from "@/lib/mappers/property-contract-inventory.mapper";

export class InventoryTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "InventoryTypesApiError";
  }
}

export class PropertyContractInventoryApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyContractInventoryApiError";
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

export async function listInventoryTypes(options?: { activeOnly?: boolean }): Promise<InventoryType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/inventory-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new InventoryTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as InventoryTypeRow[]).map(toAppInventoryType);
}

export interface PropertyContractInventoryWriteInput {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  propertyContractSeasonPeriodId: number;
  propertyRoomId: number;
  inventoryTypeId: number;
  allotmentQty: number;
  releaseDays: number;
  isStopSell?: boolean;
  isClosed?: boolean;
  isActive?: boolean;
}

export async function listPropertyContractInventories(options?: {
  tenantId?: number;
  companyId?: number;
  propertyId?: number;
  propertyContractId?: number;
  activeOnly?: boolean;
}): Promise<PropertyContractInventory[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.propertyContractId !== undefined) {
    params.set("propertyContractId", String(options.propertyContractId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-contract-inventories${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyContractInventoryApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyContractInventoryRow[]).map(toAppPropertyContractInventory);
}

export async function getPropertyContractInventory(
  propertyContractInventoryId: number
): Promise<PropertyContractInventory> {
  const res = await fetch(`/api/property-contract-inventories/${propertyContractInventoryId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractInventoryApiError(await parseError(res), res.status);
  return toAppPropertyContractInventory(await res.json());
}

export async function createPropertyContractInventory(
  input: PropertyContractInventoryWriteInput & { createdBy: number }
): Promise<PropertyContractInventory> {
  const res = await fetch("/api/property-contract-inventories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractInventoryApiError(await parseError(res), res.status);
  return toAppPropertyContractInventory(await res.json());
}

export async function updatePropertyContractInventory(
  propertyContractInventoryId: number,
  input: PropertyContractInventoryWriteInput & { modifiedBy: number }
): Promise<PropertyContractInventory> {
  const res = await fetch(`/api/property-contract-inventories/${propertyContractInventoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractInventoryApiError(await parseError(res), res.status);
  return toAppPropertyContractInventory(await res.json());
}

export async function setPropertyContractInventoryActive(
  propertyContractInventoryId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyContractInventory> {
  const res = await fetch(`/api/property-contract-inventories/${propertyContractInventoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyContractInventoryApiError(await parseError(res), res.status);
  return toAppPropertyContractInventory(await res.json());
}

export async function deletePropertyContractInventory(propertyContractInventoryId: number): Promise<void> {
  const res = await fetch(`/api/property-contract-inventories/${propertyContractInventoryId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new PropertyContractInventoryApiError(await parseError(res), res.status);
}

export async function getPropertyContractInventoryMatrix(options: {
  propertyContractId: number;
  propertyContractSeasonPeriodId: number;
  inventoryTypeId: number;
}): Promise<PropertyContractInventoryMatrixPayload> {
  const params = new URLSearchParams({
    propertyContractId: String(options.propertyContractId),
    propertyContractSeasonPeriodId: String(options.propertyContractSeasonPeriodId),
    inventoryTypeId: String(options.inventoryTypeId),
  });
  const res = await fetch(`/api/property-contract-inventories/matrix?${params}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyContractInventoryApiError(await parseError(res), res.status);
  return (await res.json()) as PropertyContractInventoryMatrixPayload;
}

export async function savePropertyContractInventoryMatrix(input: {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  propertyContractSeasonPeriodId: number;
  inventoryTypeId: number;
  createdBy: number;
  cells: PropertyContractInventoryMatrixPayload["cells"];
}): Promise<{ saved: number; removed: number }> {
  const res = await fetch("/api/property-contract-inventories/matrix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractInventoryApiError(await parseError(res), res.status);
  return (await res.json()) as { saved: number; removed: number };
}
