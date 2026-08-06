import type { PropertyType } from "@/types";
import { toAppPropertyType, type PropertyLookupRow } from "@/lib/mappers/property.mapper";

export class PropertyTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyTypesApiError";
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

export async function listPropertyTypes(options?: { activeOnly?: boolean }): Promise<PropertyType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyLookupRow[]).map(toAppPropertyType);
}

export async function createPropertyType(input: {
  propertyTypeName: string;
  isActive?: boolean;
  createdBy: number;
}): Promise<PropertyType> {
  const res = await fetch("/api/property-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyTypesApiError(await parseError(res), res.status);
  return toAppPropertyType(await res.json());
}

export async function updatePropertyType(
  propertyTypeId: number,
  input: { propertyTypeName: string; isActive?: boolean; modifiedBy: number }
): Promise<PropertyType> {
  const res = await fetch(`/api/property-types/${propertyTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyTypesApiError(await parseError(res), res.status);
  return toAppPropertyType(await res.json());
}

export async function setPropertyTypeActive(
  propertyTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyType> {
  const res = await fetch(`/api/property-types/${propertyTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyTypesApiError(await parseError(res), res.status);
  return toAppPropertyType(await res.json());
}

export async function deletePropertyType(propertyTypeId: number): Promise<void> {
  const res = await fetch(`/api/property-types/${propertyTypeId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyTypesApiError(await parseError(res), res.status);
}
