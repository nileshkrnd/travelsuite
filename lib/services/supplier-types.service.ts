import type { SupplierTypeMaster } from "@/types";
import { toAppSupplierType, type SupplierTypeRow } from "@/lib/mappers/supplier-type.mapper";

export class SupplierTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "SupplierTypesApiError";
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

export async function listSupplierTypes(options?: {
  activeOnly?: boolean;
  includeDeleted?: boolean;
}): Promise<SupplierTypeMaster[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  const qs = params.toString();
  const res = await fetch(`/api/supplier-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new SupplierTypesApiError(await parseError(res), res.status);
  const data = (await res.json()) as SupplierTypeRow[];
  return data.map(toAppSupplierType);
}

export async function createSupplierType(input: {
  supplierTypeName: string;
  isActive?: boolean;
  createdBy: number;
}): Promise<SupplierTypeMaster> {
  const res = await fetch("/api/supplier-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SupplierTypesApiError(await parseError(res), res.status);
  return toAppSupplierType(await res.json());
}

export async function updateSupplierType(
  supplierTypeId: number,
  input: { supplierTypeName: string; isActive?: boolean; modifiedBy: number }
): Promise<SupplierTypeMaster> {
  const res = await fetch(`/api/supplier-types/${supplierTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new SupplierTypesApiError(await parseError(res), res.status);
  return toAppSupplierType(await res.json());
}

export async function setSupplierTypeActive(
  supplierTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<SupplierTypeMaster> {
  const res = await fetch(`/api/supplier-types/${supplierTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new SupplierTypesApiError(await parseError(res), res.status);
  return toAppSupplierType(await res.json());
}

export async function deleteSupplierType(supplierTypeId: number, modifiedBy: number): Promise<void> {
  const res = await fetch(`/api/supplier-types/${supplierTypeId}?modifiedBy=${modifiedBy}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new SupplierTypesApiError(await parseError(res), res.status);
}
