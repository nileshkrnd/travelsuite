import { toAppSupplier, type SupplierRow } from "@/lib/mappers/supplier.mapper";
import type { Supplier } from "@/types";

export class SuppliersApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "SuppliersApiError";
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

export interface SupplierWriteInput {
  tenantId: number;
  companyId: number;
  supplierName: string;
  supplierLegalName: string;
  supplierTypeId: number;
  registrationNumber?: string | null;
  taxVatNumber?: string | null;
  countryId: number;
  stateId?: number | null;
  cityId: number;
  address: string;
  postalCode?: string | null;
  website?: string | null;
  currencyId: number;
  timeZoneId: number;
  requiresExtranetAccess: boolean;
  isActive?: boolean;
}

export async function getSupplier(supplierId: number): Promise<Supplier> {
  const res = await fetch(`/api/suppliers/${supplierId}`, { cache: "no-store" });
  if (!res.ok) throw new SuppliersApiError(await parseError(res), res.status);
  return toAppSupplier(await res.json());
}

export async function listSuppliers(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
  includeDeleted?: boolean;
}): Promise<Supplier[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  const qs = params.toString();
  const res = await fetch(`/api/suppliers${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new SuppliersApiError(await parseError(res), res.status);
  return ((await res.json()) as SupplierRow[]).map(toAppSupplier);
}

export async function createSupplier(input: SupplierWriteInput & { createdBy: number }): Promise<Supplier> {
  const res = await fetch("/api/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SuppliersApiError(await parseError(res), res.status);
  return toAppSupplier(await res.json());
}

export async function updateSupplier(
  supplierId: number,
  input: SupplierWriteInput & { modifiedBy: number }
): Promise<Supplier> {
  const res = await fetch(`/api/suppliers/${supplierId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SuppliersApiError(await parseError(res), res.status);
  return toAppSupplier(await res.json());
}

export async function setSupplierActive(
  supplierId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<Supplier> {
  const res = await fetch(`/api/suppliers/${supplierId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new SuppliersApiError(await parseError(res), res.status);
  return toAppSupplier(await res.json());
}

export async function deleteSupplier(supplierId: number, modifiedBy: number): Promise<void> {
  const res = await fetch(`/api/suppliers/${supplierId}?modifiedBy=${modifiedBy}`, { method: "DELETE" });
  if (!res.ok) throw new SuppliersApiError(await parseError(res), res.status);
}
