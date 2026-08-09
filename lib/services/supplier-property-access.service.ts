import {
  toAppSupplierPropertyAccess,
  type SupplierPropertyAccessRow,
} from "@/lib/mappers/supplier-property-access.mapper";
import type { SupplierPropertyAccess } from "@/types";

export class SupplierPropertyAccessApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "SupplierPropertyAccessApiError";
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

export interface SupplierPropertyAccessWriteInput {
  tenantId: number;
  companyId: number;
  propertySupplierId: number;
  userId: number;
  canView?: boolean;
  canCreateRate?: boolean;
  canEditRate?: boolean;
  canSubmitRate?: boolean;
  canApproveRate?: boolean;
  isActive?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}

export async function listSupplierPropertyAccess(options?: {
  tenantId?: number;
  companyId?: number;
  propertySupplierId?: number;
  userId?: number;
  activeOnly?: boolean;
}): Promise<SupplierPropertyAccess[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertySupplierId !== undefined) params.set("propertySupplierId", String(options.propertySupplierId));
  if (options?.userId !== undefined) params.set("userId", String(options.userId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/supplier-property-access${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new SupplierPropertyAccessApiError(await parseError(res), res.status);
  return ((await res.json()) as SupplierPropertyAccessRow[]).map(toAppSupplierPropertyAccess);
}

export async function getSupplierPropertyAccess(supplierPropertyAccessId: number): Promise<SupplierPropertyAccess> {
  const res = await fetch(`/api/supplier-property-access/${supplierPropertyAccessId}`, { cache: "no-store" });
  if (!res.ok) throw new SupplierPropertyAccessApiError(await parseError(res), res.status);
  return toAppSupplierPropertyAccess(await res.json());
}

export async function createSupplierPropertyAccess(
  input: SupplierPropertyAccessWriteInput & { createdBy: number }
): Promise<SupplierPropertyAccess> {
  const res = await fetch("/api/supplier-property-access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SupplierPropertyAccessApiError(await parseError(res), res.status);
  return toAppSupplierPropertyAccess(await res.json());
}

export async function updateSupplierPropertyAccess(
  supplierPropertyAccessId: number,
  input: SupplierPropertyAccessWriteInput
): Promise<SupplierPropertyAccess> {
  const res = await fetch(`/api/supplier-property-access/${supplierPropertyAccessId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SupplierPropertyAccessApiError(await parseError(res), res.status);
  return toAppSupplierPropertyAccess(await res.json());
}

export async function setSupplierPropertyAccessActive(
  supplierPropertyAccessId: number,
  isActive: boolean
): Promise<SupplierPropertyAccess> {
  const res = await fetch(`/api/supplier-property-access/${supplierPropertyAccessId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) throw new SupplierPropertyAccessApiError(await parseError(res), res.status);
  return toAppSupplierPropertyAccess(await res.json());
}

export async function deleteSupplierPropertyAccess(supplierPropertyAccessId: number): Promise<void> {
  const res = await fetch(`/api/supplier-property-access/${supplierPropertyAccessId}`, { method: "DELETE" });
  if (!res.ok) throw new SupplierPropertyAccessApiError(await parseError(res), res.status);
}
