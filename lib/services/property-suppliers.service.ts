import { toAppPropertySupplier, type PropertySupplierRow } from "@/lib/mappers/property-supplier.mapper";
import type { PropertySupplier } from "@/types";

export class PropertySuppliersApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertySuppliersApiError";
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

export interface PropertySupplierWriteInput {
  propertyId: number;
  supplierId: number;
  isPrimary?: boolean;
  isActive?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}

export async function listPropertySuppliers(options?: {
  propertyId?: number;
  supplierId?: number;
  activeOnly?: boolean;
}): Promise<PropertySupplier[]> {
  const params = new URLSearchParams();
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.supplierId !== undefined) params.set("supplierId", String(options.supplierId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-suppliers${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertySuppliersApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertySupplierRow[]).map(toAppPropertySupplier);
}

export async function createPropertySupplier(
  input: PropertySupplierWriteInput & { createdBy: number }
): Promise<PropertySupplier> {
  const res = await fetch("/api/property-suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertySuppliersApiError(await parseError(res), res.status);
  return toAppPropertySupplier(await res.json());
}

export async function updatePropertySupplier(
  propertySupplierId: number,
  input: PropertySupplierWriteInput
): Promise<PropertySupplier> {
  const res = await fetch(`/api/property-suppliers/${propertySupplierId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertySuppliersApiError(await parseError(res), res.status);
  return toAppPropertySupplier(await res.json());
}

export async function setPropertySupplierActive(
  propertySupplierId: number,
  isActive: boolean
): Promise<PropertySupplier> {
  const res = await fetch(`/api/property-suppliers/${propertySupplierId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) throw new PropertySuppliersApiError(await parseError(res), res.status);
  return toAppPropertySupplier(await res.json());
}

export async function deletePropertySupplier(propertySupplierId: number): Promise<void> {
  const res = await fetch(`/api/property-suppliers/${propertySupplierId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertySuppliersApiError(await parseError(res), res.status);
}
