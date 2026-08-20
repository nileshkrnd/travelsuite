import { toAppServiceProductRate, type ServiceProductRateRow } from "@/lib/mappers/service-product-rate.mapper";
import type { ServiceProductRate } from "@/types";

export class ServiceProductRatesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ServiceProductRatesApiError";
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

export async function listServiceProductRates(options?: {
  serviceProductId?: number;
  serviceProductSupplierId?: number;
  activeOnly?: boolean;
}): Promise<ServiceProductRate[]> {
  const params = new URLSearchParams();
  if (options?.serviceProductId !== undefined) params.set("serviceProductId", String(options.serviceProductId));
  if (options?.serviceProductSupplierId !== undefined) params.set("serviceProductSupplierId", String(options.serviceProductSupplierId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/service-product-rates${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new ServiceProductRatesApiError(await parseError(res), res.status);
  return ((await res.json()) as ServiceProductRateRow[]).map(toAppServiceProductRate);
}

export interface ServiceProductRateWriteInput {
  serviceProductId: number;
  serviceProductSupplierId: number;
  serviceProductOptionId?: number | null;
  serviceProductVariantId?: number | null;
  serviceProductScheduleId?: number | null;
  rateTypeId: number;
  minimumPax?: number | null;
  maximumPax?: number | null;
  minimumQuantity?: number | null;
  maximumQuantity?: number | null;
  rateAmount: number;
  validFrom?: string | null;
  validTo?: string | null;
  commonStatusId: number;
  days?: { dayOfWeekId: number; isActive: boolean }[];
  isActive?: boolean;
}

export async function createServiceProductRate(
  input: ServiceProductRateWriteInput & { createdBy: number }
): Promise<ServiceProductRate> {
  const res = await fetch("/api/service-product-rates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductRatesApiError(await parseError(res), res.status);
  return toAppServiceProductRate(await res.json());
}

export async function updateServiceProductRate(
  serviceProductRateId: number,
  input: ServiceProductRateWriteInput & { modifiedBy: number }
): Promise<ServiceProductRate> {
  const res = await fetch(`/api/service-product-rates/${serviceProductRateId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ServiceProductRatesApiError(await parseError(res), res.status);
  return toAppServiceProductRate(await res.json());
}

export async function setServiceProductRateActive(
  serviceProductRateId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<ServiceProductRate> {
  const res = await fetch(`/api/service-product-rates/${serviceProductRateId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new ServiceProductRatesApiError(await parseError(res), res.status);
  return toAppServiceProductRate(await res.json());
}

export async function deleteServiceProductRate(serviceProductRateId: number): Promise<void> {
  const res = await fetch(`/api/service-product-rates/${serviceProductRateId}`, { method: "DELETE" });
  if (!res.ok) throw new ServiceProductRatesApiError(await parseError(res), res.status);
}
