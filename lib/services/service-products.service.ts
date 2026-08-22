import { toAppServiceProduct, type ServiceProductRow } from "@/lib/mappers/service-product.mapper";
import type { ServiceProduct } from "@/types";

export class ServiceProductsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductsApiError";
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

export async function listServiceProducts(options?: {
  tenantId?: number;
  companyId?: number;
  serviceTypeId?: number;
  serviceProductClassificationId?: number;
  serviceProductCategoryId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProduct[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.serviceTypeId !== undefined) params.set("serviceTypeId", String(options.serviceTypeId));
  if (options?.serviceProductClassificationId !== undefined) {
    params.set("serviceProductClassificationId", String(options.serviceProductClassificationId));
  }
  if (options?.serviceProductCategoryId !== undefined) {
    params.set("serviceProductCategoryId", String(options.serviceProductCategoryId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-products${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductsApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductRow[]).map(toAppServiceProduct);
}

export async function getServiceProduct(serviceProductId: number): Promise<ServiceProduct> {
  const res = await fetch(`/api/service-products/${serviceProductId}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductsApiError(await parseError(res), res.status);
  return toAppServiceProduct(await res.json());
}

export interface ServiceProductWriteInput {
  serviceProductCode: string;
  serviceProductName: string;
  slug?: string | null;
  serviceTypeId: number;
  serviceProductClassificationId: number;
  serviceProductCategoryId?: number | null;
  supplierId?: number | null;
  countryId?: number | null;
  regionId?: number | null;
  cityId?: number | null;
  shortDescription?: string;
  description?: string;
  isOnlineSellable?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
  commonStatusId: number;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
}

export async function createServiceProduct(
  input: ServiceProductWriteInput & { createdBy: number }
): Promise<ServiceProduct> {
  const res = await fetch("/api/service-products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductsApiError(await parseError(res), res.status);
  return toAppServiceProduct(await res.json());
}

export async function updateServiceProduct(
  serviceProductId: number,
  input: ServiceProductWriteInput & { statusChangeRemarks?: string; modifiedBy: number }
): Promise<ServiceProduct> {
  const res = await fetch(`/api/service-products/${serviceProductId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductsApiError(await parseError(res), res.status);
  return toAppServiceProduct(await res.json());
}

export async function setServiceProductActive(
  serviceProductId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProduct> {
  const res = await fetch(`/api/service-products/${serviceProductId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductsApiError(await parseError(res), res.status);
  return toAppServiceProduct(await res.json());
}

export async function deleteServiceProduct(serviceProductId: number): Promise<void> {
  const res = await fetch(`/api/service-products/${serviceProductId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductsApiError(await parseError(res), res.status);
}
