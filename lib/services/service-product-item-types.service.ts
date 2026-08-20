import {
  toAppServiceProductItemType,
  type ServiceProductItemTypeRow,
} from "@/lib/mappers/service-product-item-type.mapper";
import type { ServiceProductItemType } from "@/types";

export class ServiceProductItemTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductItemTypesApiError";
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

export async function listServiceProductItemTypes(options?: {
  activeOnly?: boolean;
}): Promise<ServiceProductItemType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-item-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductItemTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductItemTypeRow[]).map(toAppServiceProductItemType);
}

export interface ServiceProductItemTypeWriteInput {
  itemTypeCode: string;
  itemTypeName: string;
  displayOrder?: number;
  isActive?: boolean;
}

export async function createServiceProductItemType(
  input: ServiceProductItemTypeWriteInput & { createdBy: number }
): Promise<ServiceProductItemType> {
  const res = await fetch("/api/service-product-item-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductItemTypesApiError(await parseError(res), res.status);
  return toAppServiceProductItemType(await res.json());
}

export async function updateServiceProductItemType(
  serviceProductItemTypeId: number,
  input: ServiceProductItemTypeWriteInput & { modifiedBy: number }
): Promise<ServiceProductItemType> {
  const res = await fetch(`/api/service-product-item-types/${serviceProductItemTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductItemTypesApiError(await parseError(res), res.status);
  return toAppServiceProductItemType(await res.json());
}

export async function setServiceProductItemTypeActive(
  serviceProductItemTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductItemType> {
  const res = await fetch(`/api/service-product-item-types/${serviceProductItemTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductItemTypesApiError(await parseError(res), res.status);
  return toAppServiceProductItemType(await res.json());
}

export async function deleteServiceProductItemType(serviceProductItemTypeId: number): Promise<void> {
  const res = await fetch(`/api/service-product-item-types/${serviceProductItemTypeId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductItemTypesApiError(await parseError(res), res.status);
}
