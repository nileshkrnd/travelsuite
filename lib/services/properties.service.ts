import { toAppProperty, type PropertyRow } from "@/lib/mappers/property.mapper";
import type { Property } from "@/types";

export class PropertiesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertiesApiError";
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

export type PropertyWriteInput = {
  /** null = a globally-managed property (Super Admin, no tenant). A real id = a tenant's own property. */
  tenantId: number | null;
  companyId: number | null;
  propertyCode: string;
  propertyName?: string | null;
  propertyDisplayName?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  internalRemarks?: string | null;
  propertyTypeIds: number[];
  propertyCategoryIds?: number[];
  propertyUsageId?: number | null;
  ownershipTypeId?: number | null;
  propertyBrandId?: number | null;
  supplierId?: number | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  buildingName?: string | null;
  buildingNumber?: string | null;
  streetName?: string | null;
  streetNumber?: string | null;
  zoneNumber?: string | null;
  countryId: number;
  stateId?: number | null;
  cityId?: number | null;
  areaId?: number | null;
  locationId?: number | null;
  postalCode?: string | null;
  poBox?: string | null;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string | null;
  googleMapUrl?: string | null;
  plusCode?: string | null;
  timeZoneId?: number | null;
  openingDate?: string | null;
  closingDate?: string | null;
  rating?: number | null;
  starRating?: number | null;
  isFeatured?: boolean;
  isPublished?: boolean;
  isActive?: boolean;
};

export async function getProperty(propertyId: number): Promise<Property> {
  const res = await fetch(`/api/properties/${propertyId}`, { cache: "no-store" });
  if (!res.ok) throw new PropertiesApiError(await parseError(res), res.status);
  return toAppProperty(await res.json());
}

export async function listProperties(options?: {
  /** Pass 0 (or set `global: true`) to fetch only globally-managed properties. */
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
  propertyTypeId?: number;
  /** Fetch only globally-managed properties (TenantID IS NULL). */
  global?: boolean;
  /** When set alongside tenantId, also merges in globally-managed properties. */
  includeGlobal?: boolean;
}): Promise<Property[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.propertyTypeId !== undefined) {
    params.set("propertyTypeId", String(options.propertyTypeId));
  }
  if (options?.global) params.set("global", "true");
  if (options?.includeGlobal) params.set("includeGlobal", "true");
  const qs = params.toString();
  const res = await fetch(`/api/properties${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertiesApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyRow[]).map(toAppProperty);
}

export async function createProperty(
  input: PropertyWriteInput & { createdBy: number }
): Promise<Property> {
  const res = await fetch("/api/properties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertiesApiError(await parseError(res), res.status);
  return toAppProperty(await res.json());
}

export async function updateProperty(
  propertyId: number,
  input: PropertyWriteInput & { modifiedBy: number }
): Promise<Property> {
  const res = await fetch(`/api/properties/${propertyId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertiesApiError(await parseError(res), res.status);
  return toAppProperty(await res.json());
}

export async function setPropertyActive(
  propertyId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<Property> {
  const res = await fetch(`/api/properties/${propertyId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertiesApiError(await parseError(res), res.status);
  return toAppProperty(await res.json());
}

export async function deleteProperty(propertyId: number): Promise<void> {
  const res = await fetch(`/api/properties/${propertyId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertiesApiError(await parseError(res), res.status);
}
