import { toAppPropertySupplier, toAppSupplierPropertyGrants, type PropertySupplierRow } from "@/lib/mappers/property-supplier.mapper";
import type { PropertySupplier, SupplierPropertyGrant } from "@/types";

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

/** Flat rows — one per (property, supplier) link. */
export async function listPropertySuppliers(options?: {
  propertyId?: number;
  supplierId?: number;
  tenantId?: number;
  activeOnly?: boolean;
}): Promise<PropertySupplier[]> {
  const params = new URLSearchParams();
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.supplierId !== undefined) params.set("supplierId", String(options.supplierId));
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-suppliers${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertySuppliersApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertySupplierRow[]).map(toAppPropertySupplier);
}

/** All of a tenant's suppliers' property links, aggregated one-per-supplier. */
export async function listSupplierPropertyGrants(tenantId: number): Promise<SupplierPropertyGrant[]> {
  const res = await fetch(`/api/property-suppliers?tenantId=${tenantId}`, { cache: "no-store" });
  if (!res.ok) throw new PropertySuppliersApiError(await parseError(res), res.status);
  const rows = (await res.json()) as PropertySupplierRow[];
  return toAppSupplierPropertyGrants(rows);
}

export interface SupplierPropertyGrantWriteInput {
  propertyIds: number[];
  isPrimary?: boolean;
  isActive?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}

export async function getSupplierPropertyGrant(supplierId: number): Promise<SupplierPropertyGrant> {
  const res = await fetch(`/api/property-suppliers/supplier/${supplierId}`, { cache: "no-store" });
  if (!res.ok) throw new PropertySuppliersApiError(await parseError(res), res.status);
  return res.json();
}

export async function saveSupplierPropertyGrant(
  supplierId: number,
  input: SupplierPropertyGrantWriteInput & { createdBy: number }
): Promise<SupplierPropertyGrant> {
  const res = await fetch(`/api/property-suppliers/supplier/${supplierId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertySuppliersApiError(await parseError(res), res.status);
  return res.json();
}

export async function setSupplierPropertyGrantActive(
  supplierId: number,
  isActive: boolean
): Promise<SupplierPropertyGrant> {
  const res = await fetch(`/api/property-suppliers/supplier/${supplierId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) throw new PropertySuppliersApiError(await parseError(res), res.status);
  return res.json();
}

export async function deleteSupplierPropertyGrant(supplierId: number): Promise<void> {
  const res = await fetch(`/api/property-suppliers/supplier/${supplierId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertySuppliersApiError(await parseError(res), res.status);
}
