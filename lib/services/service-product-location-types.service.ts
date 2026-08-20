import {
  toAppServiceProductLocationType,
  type ServiceProductLocationTypeRow,
} from "@/lib/mappers/service-product-location-type.mapper";
import type { ServiceProductLocationType } from "@/types";

export class ServiceProductLocationTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductLocationTypesApiError";
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

export async function listServiceProductLocationTypes(options?: {
  activeOnly?: boolean;
}): Promise<ServiceProductLocationType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-location-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductLocationTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductLocationTypeRow[]).map(toAppServiceProductLocationType);
}

export interface ServiceProductLocationTypeWriteInput {
  locationTypeCode: string;
  locationTypeName: string;
  description?: string | null;
  isPickupLocation?: boolean;
  isDropoffLocation?: boolean;
  isMeetingPoint?: boolean;
  isDestination?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

export async function createServiceProductLocationType(
  input: ServiceProductLocationTypeWriteInput & { createdBy: number }
): Promise<ServiceProductLocationType> {
  const res = await fetch("/api/service-product-location-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductLocationTypesApiError(await parseError(res), res.status);
  return toAppServiceProductLocationType(await res.json());
}

export async function updateServiceProductLocationType(
  serviceProductLocationTypeId: number,
  input: ServiceProductLocationTypeWriteInput & { modifiedBy: number }
): Promise<ServiceProductLocationType> {
  const res = await fetch(`/api/service-product-location-types/${serviceProductLocationTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductLocationTypesApiError(await parseError(res), res.status);
  return toAppServiceProductLocationType(await res.json());
}

export async function setServiceProductLocationTypeActive(
  serviceProductLocationTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductLocationType> {
  const res = await fetch(`/api/service-product-location-types/${serviceProductLocationTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductLocationTypesApiError(await parseError(res), res.status);
  return toAppServiceProductLocationType(await res.json());
}

export async function deleteServiceProductLocationType(serviceProductLocationTypeId: number): Promise<void> {
  const res = await fetch(`/api/service-product-location-types/${serviceProductLocationTypeId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductLocationTypesApiError(await parseError(res), res.status);
}
