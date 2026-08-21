import {
  toAppServiceProductInventory,
  type ServiceProductInventoryRow,
} from "@/lib/mappers/service-product-inventory.mapper";
import type { ServiceProductInventory } from "@/types";

export class ServiceProductInventoriesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductInventoriesApiError";
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

export async function listServiceProductInventories(options?: {
  serviceProductId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductInventory[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-inventories${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductInventoriesApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductInventoryRow[]).map(toAppServiceProductInventory);
}

export interface ServiceProductInventoryPeriodInput {
  fromDate: string;
  toDate: string;
  isMonday?: boolean;
  isTuesday?: boolean;
  isWednesday?: boolean;
  isThursday?: boolean;
  isFriday?: boolean;
  isSaturday?: boolean;
  isSunday?: boolean;
  allotmentQty?: number;
  releaseDays?: number;
  isActive?: boolean;
}

export interface ServiceProductInventoryWriteInput {
  serviceProductId: number;
  serviceProductSupplierId?: number | null;
  serviceProductOptionId?: number | null;
  serviceProductVariantId?: number | null;
  serviceProductScheduleId?: number | null;
  inventoryTypeId: number;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
  periods?: ServiceProductInventoryPeriodInput[];
}

export async function createServiceProductInventory(
  input: ServiceProductInventoryWriteInput & { createdBy: number }
): Promise<ServiceProductInventory> {
  const res = await fetch("/api/service-product-inventories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductInventoriesApiError(await parseError(res), res.status);
  return toAppServiceProductInventory(await res.json());
}

export async function updateServiceProductInventory(
  serviceProductInventoryId: number,
  input: ServiceProductInventoryWriteInput & { modifiedBy: number }
): Promise<ServiceProductInventory> {
  const res = await fetch(`/api/service-product-inventories/${serviceProductInventoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductInventoriesApiError(await parseError(res), res.status);
  return toAppServiceProductInventory(await res.json());
}

export async function setServiceProductInventoryActive(
  serviceProductInventoryId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductInventory> {
  const res = await fetch(`/api/service-product-inventories/${serviceProductInventoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductInventoriesApiError(await parseError(res), res.status);
  return toAppServiceProductInventory(await res.json());
}

export async function deleteServiceProductInventory(serviceProductInventoryId: number): Promise<void> {
  const res = await fetch(`/api/service-product-inventories/${serviceProductInventoryId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductInventoriesApiError(await parseError(res), res.status);
}
