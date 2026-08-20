import {
  toAppServiceProductSupplierLocation,
  type ServiceProductSupplierLocationRow,
} from "@/lib/mappers/service-product-supplier-location.mapper";
import type { ServiceProductSupplierLocation } from "@/types";

export class ServiceProductSupplierLocationsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductSupplierLocationsApiError";
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

export async function listServiceProductSupplierLocations(options?: {
  serviceProductSupplierId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductSupplierLocation[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductSupplierId !== undefined)
    params.set("serviceProductSupplierId", String(options.serviceProductSupplierId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-supplier-locations${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductSupplierLocationsApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductSupplierLocationRow[]).map(toAppServiceProductSupplierLocation);
}

export interface ServiceProductSupplierLocationWriteInput {
  serviceProductSupplierId: number;
  serviceProductLocationId?: number | null;
  serviceProductLocationTypeId: number;
  countryId: number;
  regionId?: number | null;
  cityId?: number | null;
  areaId?: number | null;
  supplierLocationCode?: string | null;
  supplierLocationName: string;
  supplierLocationReference?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  supplierGooglePlaceId?: string | null;
  locationInstructions?: string | null;
  isPickupAvailable?: boolean;
  isDropoffAvailable?: boolean;
  isMeetingPoint?: boolean;
  isPrimary?: boolean;
  isAvailable?: boolean;
  displayOrder?: number;
  commonStatusId: number;
  isActive?: boolean;
}

export async function createServiceProductSupplierLocation(
  input: ServiceProductSupplierLocationWriteInput & { createdBy: number }
): Promise<ServiceProductSupplierLocation> {
  const res = await fetch("/api/service-product-supplier-locations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductSupplierLocationsApiError(await parseError(res), res.status);
  return toAppServiceProductSupplierLocation(await res.json());
}

export async function updateServiceProductSupplierLocation(
  serviceProductSupplierLocationId: number,
  input: ServiceProductSupplierLocationWriteInput & { modifiedBy: number }
): Promise<ServiceProductSupplierLocation> {
  const res = await fetch(`/api/service-product-supplier-locations/${serviceProductSupplierLocationId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductSupplierLocationsApiError(await parseError(res), res.status);
  return toAppServiceProductSupplierLocation(await res.json());
}

export async function setServiceProductSupplierLocationActive(
  serviceProductSupplierLocationId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductSupplierLocation> {
  const res = await fetch(`/api/service-product-supplier-locations/${serviceProductSupplierLocationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductSupplierLocationsApiError(await parseError(res), res.status);
  return toAppServiceProductSupplierLocation(await res.json());
}

export async function deleteServiceProductSupplierLocation(serviceProductSupplierLocationId: number): Promise<void> {
  const res = await fetch(`/api/service-product-supplier-locations/${serviceProductSupplierLocationId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new ServiceProductSupplierLocationsApiError(await parseError(res), res.status);
}
