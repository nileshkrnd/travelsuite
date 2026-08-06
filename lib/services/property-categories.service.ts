import type { PropertyCategory } from "@/types";
import { toAppPropertyCategory, type PropertyLookupRow } from "@/lib/mappers/property.mapper";

export class PropertyCategoriesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyCategoriesApiError";
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

export async function listPropertyCategories(options?: {
  activeOnly?: boolean;
}): Promise<PropertyCategory[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-categories${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyCategoriesApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyLookupRow[]).map(toAppPropertyCategory);
}

export async function createPropertyCategory(input: {
  propertyCategoryName: string;
  isActive?: boolean;
  createdBy: number;
}): Promise<PropertyCategory> {
  const res = await fetch("/api/property-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyCategoriesApiError(await parseError(res), res.status);
  return toAppPropertyCategory(await res.json());
}

export async function updatePropertyCategory(
  propertyCategoryId: number,
  input: { propertyCategoryName: string; isActive?: boolean; modifiedBy: number }
): Promise<PropertyCategory> {
  const res = await fetch(`/api/property-categories/${propertyCategoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyCategoriesApiError(await parseError(res), res.status);
  return toAppPropertyCategory(await res.json());
}

export async function setPropertyCategoryActive(
  propertyCategoryId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyCategory> {
  const res = await fetch(`/api/property-categories/${propertyCategoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyCategoriesApiError(await parseError(res), res.status);
  return toAppPropertyCategory(await res.json());
}

export async function deletePropertyCategory(propertyCategoryId: number): Promise<void> {
  const res = await fetch(`/api/property-categories/${propertyCategoryId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyCategoriesApiError(await parseError(res), res.status);
}
