import type { PropertyBrand } from "@/types";
import { toAppPropertyBrand, type PropertyLookupRow } from "@/lib/mappers/property.mapper";

export class PropertyBrandsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyBrandsApiError";
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

export async function listPropertyBrands(options?: { activeOnly?: boolean }): Promise<PropertyBrand[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-brands${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyBrandsApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyLookupRow[]).map(toAppPropertyBrand);
}

export async function createPropertyBrand(input: {
  propertyBrandName: string;
  isActive?: boolean;
  createdBy: number;
}): Promise<PropertyBrand> {
  const res = await fetch("/api/property-brands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyBrandsApiError(await parseError(res), res.status);
  return toAppPropertyBrand(await res.json());
}

export async function updatePropertyBrand(
  propertyBrandId: number,
  input: { propertyBrandName: string; isActive?: boolean; modifiedBy: number }
): Promise<PropertyBrand> {
  const res = await fetch(`/api/property-brands/${propertyBrandId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyBrandsApiError(await parseError(res), res.status);
  return toAppPropertyBrand(await res.json());
}

export async function setPropertyBrandActive(
  propertyBrandId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyBrand> {
  const res = await fetch(`/api/property-brands/${propertyBrandId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyBrandsApiError(await parseError(res), res.status);
  return toAppPropertyBrand(await res.json());
}

export async function deletePropertyBrand(propertyBrandId: number): Promise<void> {
  const res = await fetch(`/api/property-brands/${propertyBrandId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyBrandsApiError(await parseError(res), res.status);
}
