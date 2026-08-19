import {
  toAppServiceProductCategory,
  type ServiceProductCategoryRow,
} from "@/lib/mappers/service-product-category.mapper";
import type { ServiceProductCategory } from "@/types";

export class ServiceProductCategoriesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductCategoriesApiError";
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

export async function listServiceProductCategories(options?: {
  tenantId?: number;
  companyId?: number;
  serviceTypeId?: number;
  serviceProductClassificationId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductCategory[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.serviceTypeId !== undefined) params.set("serviceTypeId", String(options.serviceTypeId));
  if (options?.serviceProductClassificationId !== undefined) {
    params.set("serviceProductClassificationId", String(options.serviceProductClassificationId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-categories${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductCategoriesApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductCategoryRow[]).map(toAppServiceProductCategory);
}

export interface ServiceProductCategoryWriteInput {
  serviceTypeId: number;
  serviceProductClassificationId?: number | null;
  parentServiceProductCategoryId?: number | null;
  categoryCode: string;
  categoryName: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  displayOrder?: number;
  isFeatured?: boolean;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
}

export async function createServiceProductCategory(
  input: ServiceProductCategoryWriteInput & { createdBy: number }
): Promise<ServiceProductCategory> {
  const res = await fetch("/api/service-product-categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductCategoriesApiError(await parseError(res), res.status);
  return toAppServiceProductCategory(await res.json());
}

export async function updateServiceProductCategory(
  serviceProductCategoryId: number,
  input: ServiceProductCategoryWriteInput & { modifiedBy: number }
): Promise<ServiceProductCategory> {
  const res = await fetch(`/api/service-product-categories/${serviceProductCategoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductCategoriesApiError(await parseError(res), res.status);
  return toAppServiceProductCategory(await res.json());
}

export async function setServiceProductCategoryActive(
  serviceProductCategoryId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductCategory> {
  const res = await fetch(`/api/service-product-categories/${serviceProductCategoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductCategoriesApiError(await parseError(res), res.status);
  return toAppServiceProductCategory(await res.json());
}

export async function deleteServiceProductCategory(serviceProductCategoryId: number): Promise<void> {
  const res = await fetch(`/api/service-product-categories/${serviceProductCategoryId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new ServiceProductCategoriesApiError(await parseError(res), res.status);
}
