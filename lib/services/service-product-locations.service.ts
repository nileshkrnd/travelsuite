import {
  toAppServiceProductLocation,
  type ServiceProductLocationRow,
} from "@/lib/mappers/service-product-location.mapper";
import type { ServiceProductLocation } from "@/types";

export class ServiceProductLocationsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductLocationsApiError";
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

export async function listServiceProductLocations(options?: {
  serviceProductId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductLocation[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-locations${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductLocationsApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductLocationRow[]).map(toAppServiceProductLocation);
}

export interface ServiceProductLocationWriteInput {
  serviceProductId: number;
  serviceProductLocationTypeId: number;
  countryId: number;
  regionId?: number | null;
  cityId?: number | null;
  areaId?: number | null;
  locationName: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string | null;
  googleMapUrl?: string | null;
  locationInstructions?: string | null;
  isPrimary?: boolean;
  displayOrder?: number;
  commonStatusId: number;
  isActive?: boolean;
}

export async function createServiceProductLocation(
  input: ServiceProductLocationWriteInput & { createdBy: number }
): Promise<ServiceProductLocation> {
  const res = await fetch("/api/service-product-locations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductLocationsApiError(await parseError(res), res.status);
  return toAppServiceProductLocation(await res.json());
}

export async function updateServiceProductLocation(
  serviceProductLocationId: number,
  input: ServiceProductLocationWriteInput & { modifiedBy: number }
): Promise<ServiceProductLocation> {
  const res = await fetch(`/api/service-product-locations/${serviceProductLocationId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductLocationsApiError(await parseError(res), res.status);
  return toAppServiceProductLocation(await res.json());
}

export async function setServiceProductLocationActive(
  serviceProductLocationId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductLocation> {
  const res = await fetch(`/api/service-product-locations/${serviceProductLocationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductLocationsApiError(await parseError(res), res.status);
  return toAppServiceProductLocation(await res.json());
}

export async function deleteServiceProductLocation(serviceProductLocationId: number): Promise<void> {
  const res = await fetch(`/api/service-product-locations/${serviceProductLocationId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductLocationsApiError(await parseError(res), res.status);
}
