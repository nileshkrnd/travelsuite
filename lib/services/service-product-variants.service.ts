import { toAppServiceProductVariant, type ServiceProductVariantRow } from "@/lib/mappers/service-product-variant.mapper";
import type { ServiceProductVariant } from "@/types";

export class ServiceProductVariantsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductVariantsApiError";
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

export async function listServiceProductVariants(options?: {
  serviceProductOptionId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductVariant[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductOptionId !== undefined) {
    params.set("serviceProductOptionId", String(options.serviceProductOptionId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-variants${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductVariantsApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductVariantRow[]).map(toAppServiceProductVariant);
}

export interface ServiceProductVariantWriteInput {
  serviceProductOptionId: number;
  variantCode: string;
  variantName: string;
  description?: string;
  displayOrder?: number;
  isDefault?: boolean;
  isOnlineSellable?: boolean;
  commonStatusId: number;
  isActive?: boolean;
}

export async function createServiceProductVariant(
  input: ServiceProductVariantWriteInput & { createdBy: number }
): Promise<ServiceProductVariant> {
  const res = await fetch("/api/service-product-variants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductVariantsApiError(await parseError(res), res.status);
  return toAppServiceProductVariant(await res.json());
}

export async function updateServiceProductVariant(
  serviceProductVariantId: number,
  input: ServiceProductVariantWriteInput & { modifiedBy: number }
): Promise<ServiceProductVariant> {
  const res = await fetch(`/api/service-product-variants/${serviceProductVariantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductVariantsApiError(await parseError(res), res.status);
  return toAppServiceProductVariant(await res.json());
}

export async function setServiceProductVariantActive(
  serviceProductVariantId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductVariant> {
  const res = await fetch(`/api/service-product-variants/${serviceProductVariantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductVariantsApiError(await parseError(res), res.status);
  return toAppServiceProductVariant(await res.json());
}

export async function deleteServiceProductVariant(serviceProductVariantId: number): Promise<void> {
  const res = await fetch(`/api/service-product-variants/${serviceProductVariantId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductVariantsApiError(await parseError(res), res.status);
}
