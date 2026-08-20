import { toAppServiceProductSupplier, type ServiceProductSupplierRow } from "@/lib/mappers/service-product-supplier.mapper";
import type { ServiceProductSupplier } from "@/types";

export class ServiceProductSuppliersApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductSuppliersApiError";
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

export async function listServiceProductSuppliers(options?: {
  serviceProductId?: number;
  supplierId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductSupplier[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.supplierId !== undefined) params.set("supplierId", String(options.supplierId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-suppliers${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductSuppliersApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductSupplierRow[]).map(toAppServiceProductSupplier);
}

export interface ServiceProductSupplierWriteInput {
  serviceProductId: number;
  supplierId: number;
  supplierProductCode?: string;
  isPrimary?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
}

export async function createServiceProductSupplier(
  input: ServiceProductSupplierWriteInput & { createdBy: number }
): Promise<ServiceProductSupplier> {
  const res = await fetch("/api/service-product-suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductSuppliersApiError(await parseError(res), res.status);
  return toAppServiceProductSupplier(await res.json());
}

export async function updateServiceProductSupplier(
  serviceProductSupplierId: number,
  input: ServiceProductSupplierWriteInput & { modifiedBy: number }
): Promise<ServiceProductSupplier> {
  const res = await fetch(`/api/service-product-suppliers/${serviceProductSupplierId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductSuppliersApiError(await parseError(res), res.status);
  return toAppServiceProductSupplier(await res.json());
}

export async function setServiceProductSupplierActive(
  serviceProductSupplierId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductSupplier> {
  const res = await fetch(`/api/service-product-suppliers/${serviceProductSupplierId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductSuppliersApiError(await parseError(res), res.status);
  return toAppServiceProductSupplier(await res.json());
}

export async function deleteServiceProductSupplier(serviceProductSupplierId: number): Promise<void> {
  const res = await fetch(`/api/service-product-suppliers/${serviceProductSupplierId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductSuppliersApiError(await parseError(res), res.status);
}
